// POST /api/skill/initialize — 接收用户输入，创建执行记录，触发 S00
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { executeSkillViaLlm, resolveApiKey } from '@/lib/llm-gateway';
import type { InitializeRequest } from '@/lib/schema/types';

export async function POST(req: NextRequest) {
  try {
    const body: InitializeRequest = await req.json();
    const { user_input, mode, api_provider, model_name, api_key_override } = body;

    if (!user_input?.trim()) {
      return NextResponse.json({ error: '请输入需求描述' }, { status: 400 });
    }

    // 输入长度校验（防止超大请求导致 LLM 超时或 500）
    if (user_input.trim().length > 5000) {
      return NextResponse.json(
        { error: '输入内容不能超过 5000 字符，当前: ' + user_input.trim().length },
        { status: 400 }
      );
    }

    // 解析 API Key
    const apiKey = resolveApiKey(api_provider, api_key_override);

    // 创建 Execution 记录
    const execution = await prisma.execution.create({
      data: {
        userInput: user_input,
        mode,
        state: 'in_progress',
        currentSkill: 'skill-00-navigator',
        apiProvider: api_provider,
        modelName: model_name,
      },
    });

    // 如果是模式 D/E，先触发圆桌（此处标记，圆桌 API 单独调用）
    const needsCouncil = mode === 'D' || mode === 'E';
    if (needsCouncil) {
      return NextResponse.json({
        execution_id: execution.id,
        current_handoff: null,
        next_action: 'council_review',
        next_skill: 'skill-00-navigator',
      });
    }

    // 调用 S00 Navigator
    const result = await executeSkillViaLlm({
      skillCode: 'skill-00-navigator',
      incomingHandoff: null,
      userInput: user_input,
      apiProvider: api_provider,
      apiKey,
      modelName: model_name,
    });

    // 保存执行步骤
    await prisma.executionStep.create({
      data: {
        executionId: execution.id,
        stepNumber: 0,
        skillCode: 'skill-00-navigator',
        status: 'success',
        inputHandoff: { user_input } as object,
        outputHandoff: result.output_handoff as object,
        rawAiResponse: result.raw_response,
        durationMs: result.duration_ms,
        completedAt: new Date(),
      },
    });

    // 更新执行状态
    const nextSkill = result.output_handoff.to_skill;
    await prisma.execution.update({
      where: { id: execution.id },
      data: {
        currentSkill: nextSkill !== 'user' ? nextSkill : null,
        state: nextSkill === 'user' ? 'completed' : 'in_progress',
      },
    });

    const isAutoMode = mode === 'C';
    const nextAction = isAutoMode ? 'skill_execution' : 'user_input';

    return NextResponse.json({
      execution_id: execution.id,
      current_handoff: result.output_handoff,
      next_action: nextAction,
      next_skill: nextSkill !== 'user' ? nextSkill : undefined,
    });

  } catch (err) {
    console.error('[/api/skill/initialize]', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : '服务器内部错误' },
      { status: 500 }
    );
  }
}
