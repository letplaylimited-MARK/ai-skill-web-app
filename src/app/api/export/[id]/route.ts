// GET /api/export/[id] — 导出完整执行报告
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

function generateMarkdownReport(execution: {
  id: string;
  userInput: string;
  mode: string;
  state: string;
  apiProvider: string;
  councilReport: unknown;
  steps: Array<{
    stepNumber: number;
    skillCode: string;
    status: string;
    outputHandoff: unknown;
    durationMs: number | null;
    createdAt: Date;
  }>;
  createdAt: Date;
}): string {
  const date = new Date(execution.createdAt).toLocaleString('zh-CN');
  const skillNames: Record<string, string> = {
    'skill-00-navigator': 'Skill 00 · 导航官',
    'skill-01-prompt-engineer': 'Skill 01 · 提示词工程师',
    'skill-02-sop-engineer': 'Skill 02 · SOP 工程师',
    'skill-03-scout': 'Skill 03 · 开源侦察官',
    'skill-04-planner': 'Skill 04 · 执行规划官',
    'skill-05-validator': 'Skill 05 · 测试验收工程师',
  };

  let md = `# AI Skill 执行报告

**执行 ID**：${execution.id}  
**执行时间**：${date}  
**执行模式**：模式 ${execution.mode}  
**状态**：${execution.state === 'completed' ? '✅ 已完成' : execution.state === 'failed' ? '❌ 失败' : '⏳ 进行中'}  
**AI 提供商**：${execution.apiProvider}

---

## 用户需求

${execution.userInput}

---
`;

  // 圆桌报告
  if (execution.councilReport) {
    const council = execution.councilReport as { requirement_summary?: string; consensus?: { decision?: string; highest_risks?: string[]; p0_gate?: boolean }; voices?: Array<{ role_name: string; risk_level: string; execution_warnings: string[]; capability_cannot: string[] }> };
    md += `## 圆桌预检报告

**决策**：${council.consensus?.decision || '未知'}  
**P0 门控**：${council.consensus?.p0_gate ? '⚠️ 有阻塞问题' : '✅ 无阻塞'}

### 最高风险
${(council.consensus?.highest_risks || []).map((r: string) => `- ${r}`).join('\n')}

### 六角色意见摘要

${(council.voices || []).map((v) => `**${v.role_name}**（风险等级：${v.risk_level}）
- 执行预警：${v.execution_warnings?.[0] || '无'}
- 能力边界：${v.capability_cannot?.[0] || '无'}`).join('\n\n')}

---
`;
  }

  // 执行步骤
  md += `## 执行步骤详情\n\n`;
  for (const step of execution.steps) {
    const skillName = skillNames[step.skillCode] || step.skillCode;
    const duration = step.durationMs ? `${(step.durationMs / 1000).toFixed(1)}s` : '—';
    const status = step.status === 'success' ? '✅' : step.status === 'error' ? '❌' : '⏳';
    
    md += `### Step ${step.stepNumber}：${skillName} ${status}

**耗时**：${duration}  
**执行时间**：${new Date(step.createdAt).toLocaleString('zh-CN')}

`;
    if (step.outputHandoff) {
      const handoff = step.outputHandoff as { payload?: Record<string, unknown> };
      if (handoff.payload) {
        md += `**输出摘要**：\n\`\`\`json\n${JSON.stringify(handoff.payload, null, 2).slice(0, 1000)}\n\`\`\`\n\n`;
      }
    }
    md += '---\n\n';
  }

  return md;
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(req.url);
    const format = searchParams.get('format') || 'json';

    const execution = await prisma.execution.findUnique({
      where: { id },
      include: { steps: { orderBy: { stepNumber: 'asc' } } },
    });

    if (!execution) {
      return NextResponse.json({ error: 'Execution not found' }, { status: 404 });
    }

    if (format === 'markdown') {
      const markdown = generateMarkdownReport(execution);
      return new NextResponse(markdown, {
        headers: {
          'Content-Type': 'text/markdown; charset=utf-8',
          'Content-Disposition': `attachment; filename="execution-${id.slice(0, 8)}.md"`,
        },
      });
    }

    // JSON 格式：返回完整执行数据 + 交接包链
    const handoffChain = execution.steps
      .filter((s) => s.outputHandoff)
      .map((s) => s.outputHandoff);

    return NextResponse.json({
      execution,
      handoff_chain: handoffChain,
      markdown_report: generateMarkdownReport(execution),
    });

  } catch (err) {
    console.error('[/api/export/[id]]', err);
    return NextResponse.json({ error: '导出失败' }, { status: 500 });
  }
}
