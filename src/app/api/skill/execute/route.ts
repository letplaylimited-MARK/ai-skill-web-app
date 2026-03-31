// POST /api/skill/execute — 执行指定 Skill（步进式）
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { executeSkillViaLlm, resolveApiKey, needsUserApproval } from '@/lib/llm-gateway';
import type { SkillCode } from '@/lib/schema/types';

export async function POST(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const executionId = searchParams.get('execution_id');
    const skillCode = searchParams.get('skill_code') as SkillCode;

    if (!executionId || !skillCode) {
      return NextResponse.json({ error: 'execution_id 和 skill_code 参数必填' }, { status: 400 });
    }

    // 解析请求体（用户可能传递编辑后的 handoff）
    let body: { user_edited_handoff?: Record<string, unknown>; api_key_override?: string } = {};
    try {
      const rawBody = await req.text();
      if (rawBody.trim()) body = JSON.parse(rawBody);
    } catch { /* 空 body 允许 */ }

    const { user_edited_handoff, api_key_override } = body;

    // 获取执行记录（含所有步骤）
    const execution = await prisma.execution.findUnique({
      where: { id: executionId },
      include: { steps: { orderBy: { stepNumber: 'asc' } } },
    });
    if (!execution) {
      return NextResponse.json({ error: `Execution ${executionId} not found` }, { status: 404 });
    }

    // 获取上一步的输出作为本步骤的输入（从数据库中取）
    const previousSteps = execution.steps.filter((s: { status: string }) => s.status === 'success');
    const lastStep = previousSteps[previousSteps.length - 1];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const baseHandoff = (lastStep?.outputHandoff as any) || null;

    // 如果用户编辑了 handoff，合并使用
    const inputHandoff = user_edited_handoff
      ? { ...baseHandoff, ...user_edited_handoff }
      : baseHandoff;

    const apiKey = resolveApiKey(execution.apiProvider as 'claude' | 'openai', api_key_override);
    const stepNumber = execution.steps.length;

    // 创建步骤记录（运行中）
    const step = await prisma.executionStep.create({
      data: {
        executionId,
        stepNumber,
        skillCode,
        status: 'running',
        inputHandoff: (inputHandoff || { user_input: execution.userInput }) as object,
      },
    });

    // 更新执行状态
    await prisma.execution.update({
      where: { id: executionId },
      data: { currentSkill: skillCode, state: 'in_progress' },
    });

    // 调用 AI
    let result;
    try {
      result = await executeSkillViaLlm({
        skillCode,
        incomingHandoff: inputHandoff,
        userInput: execution.userInput,
        apiProvider: execution.apiProvider as 'claude' | 'openai',
        apiKey,
        modelName: execution.modelName ?? undefined,
      });
    } catch (aiError) {
      // AI 调用失败，更新步骤状态
      await prisma.executionStep.update({
        where: { id: step.id },
        data: {
          status: 'error',
          errorMessage: aiError instanceof Error ? aiError.message : String(aiError),
          completedAt: new Date(),
        },
      });
      await prisma.execution.update({
        where: { id: executionId },
        data: { state: 'failed' },
      });
      return NextResponse.json(
        { error: `AI 调用失败: ${aiError instanceof Error ? aiError.message : aiError}` },
        { status: 500 }
      );
    }

    // 更新步骤为成功
    await prisma.executionStep.update({
      where: { id: step.id },
      data: {
        status: 'success',
        outputHandoff: result.output_handoff as object,
        rawAiResponse: result.raw_response,
        durationMs: result.duration_ms,
        completedAt: new Date(),
      },
    });

    // 判断是否完成
    const nextSkill = result.output_handoff.to_skill;
    const isComplete = nextSkill === 'user' || !nextSkill;

    await prisma.execution.update({
      where: { id: executionId },
      data: {
        currentSkill: isComplete ? null : (nextSkill as SkillCode),
        state: isComplete ? 'completed' : 'in_progress',
        finalReport: isComplete ? result.raw_response : undefined,
      },
    });

    // 是否需要用户审批（下一步执行前）
    const requiresApproval = !isComplete && needsUserApproval(execution.mode, nextSkill as SkillCode);

    return NextResponse.json({
      execution_id: executionId,
      step_id: step.id,
      next_skill: isComplete ? undefined : (nextSkill as SkillCode),
      output_handoff: result.output_handoff,
      is_complete: isComplete,
      needs_user_approval: requiresApproval,
    });

  } catch (err) {
    console.error('[/api/skill/execute]', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : '服务器内部错误' },
      { status: 500 }
    );
  }
}
