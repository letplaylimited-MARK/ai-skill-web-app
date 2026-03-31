// POST /api/council/run — 圆桌预检（六角色同时发言）
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { resolveApiKey } from '@/lib/llm-gateway';
import Anthropic from '@anthropic-ai/sdk';
import OpenAI from 'openai';
import type { CouncilPackage } from '@/lib/schema/types';

const COUNCIL_SYSTEM_PROMPT = `你是「AI Skill 技能圆桌」的主持人协调官。

接收用户需求后，你需要模拟六个 Skill 角色的发言，进行结构化的圆桌预检：

角色列表：
1. Skill 00 · Navigator（全局路径规划师）
2. Skill 01 · 提示词工程师（语言与意图精准性专家）
3. Skill 02 · SOP 工程师（工程化与可复用性专家）
4. Skill 03 · Scout（技术选型与外部依赖专家）
5. Skill 04 · Planner（可执行性与步骤完整性专家）
6. Skill 05 · Validator（质量底线与验收标准专家）

每个角色必须：
1. 说明从自己视角看到的关键风险
2. 明确声明「我做不了什么」（能力边界）
3. 提出对其他角色的期望或质疑

最后综合六个角色的意见，给出：
- 推荐执行路径
- 最高优先级风险
- 是否有 P0 门控问题（需要立即暂停解决的阻塞问题）
- 决策：proceed（继续）/ adjust（调整方案）/ clarify（需要澄清）

输出严格的 JSON 格式（不要用 markdown 代码块包裹，直接输出 JSON）：
{
  "schema_version": "1.0",
  "session_id": "[uuid]",
  "triggered_by": "user",
  "requirement_summary": "[需求摘要]",
  "voices": [
    {
      "skill_code": "skill-00-navigator",
      "role_name": "全局路径规划师",
      "perspective": "[视角解读]",
      "capability_can": ["[能做的1]"],
      "capability_cannot": ["[不能做的1]"],
      "execution_warnings": ["[警告1]"],
      "questions_to_siblings": ["[对其他角色的问题]"],
      "risk_level": "low|medium|high"
    }
  ],
  "consensus": {
    "recommended_path": ["skill-00-navigator", "..."],
    "highest_risks": ["[风险1]"],
    "p0_gate": false,
    "p0_reason": null,
    "decision": "proceed|adjust|clarify"
  },
  "created_at": "[ISO日期]"
}`;

export async function POST(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const body = await req.json();
    const { user_input: bodyUserInput, topic, api_key_override, execution_id: bodyExecId } = body;
    
    // execution_id 兼容 query param 和 body
    const executionId = searchParams.get('execution_id') || bodyExecId;
    const user_input = bodyUserInput || topic; // 兼容两种字段名

    if (!executionId || !user_input) {
      return NextResponse.json({ error: 'execution_id 和 user_input/topic 必填' }, { status: 400 });
    }

    const execution = await prisma.execution.findUnique({ where: { id: executionId } });
    if (!execution) {
      return NextResponse.json({ error: 'Execution not found' }, { status: 404 });
    }

    const apiKey = resolveApiKey(execution.apiProvider as 'claude' | 'openai', api_key_override);
    const userMessage = `用户需求：${user_input}\n\n请进行六角色圆桌预检，输出 JSON 报告。`;

    let rawResponse: string;
    if (execution.apiProvider === 'claude') {
      const client = new Anthropic({ apiKey });
      const res = await client.messages.create({
        model: execution.modelName || 'claude-3-5-sonnet-20241022',
        max_tokens: 4096,
        system: COUNCIL_SYSTEM_PROMPT,
        messages: [{ role: 'user', content: userMessage }],
      });
      const content = res.content[0];
      rawResponse = content.type === 'text' ? content.text : '';
    } else {
      const client = new OpenAI({ apiKey });
      const res = await client.chat.completions.create({
        model: execution.modelName || 'gpt-4o',
        messages: [
          { role: 'system', content: COUNCIL_SYSTEM_PROMPT },
          { role: 'user', content: userMessage },
        ],
        response_format: { type: 'json_object' },
        max_tokens: 4096,
      });
      rawResponse = res.choices[0]?.message?.content || '{}';
    }

    // 解析 JSON 响应
    let councilPackage: CouncilPackage;
    try {
      // 清理可能的 markdown 代码块
      const cleaned = rawResponse.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      councilPackage = JSON.parse(cleaned);
    } catch {
      councilPackage = {
        schema_version: '1.0',
        session_id: executionId,
        triggered_by: 'user',
        requirement_summary: user_input,
        voices: [],
        consensus: {
          recommended_path: ['skill-00-navigator'],
          highest_risks: ['圆桌预检解析失败'],
          p0_gate: false,
          decision: 'proceed',
        },
        created_at: new Date().toISOString(),
      };
    }

    // 更新执行记录的圆桌报告
    await prisma.execution.update({
      where: { id: executionId },
      data: {
        councilReport: councilPackage as object,
        councilPassed: !councilPackage.consensus.p0_gate,
      },
    });

    return NextResponse.json({
      council_report: councilPackage,
      council_package: councilPackage,
      p0_gate: councilPackage.consensus.p0_gate,
      decision: councilPackage.consensus.decision,
      can_proceed: !councilPackage.consensus.p0_gate,
    });

  } catch (err) {
    console.error('[/api/council/run]', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : '圆桌预检失败' },
      { status: 500 }
    );
  }
}
