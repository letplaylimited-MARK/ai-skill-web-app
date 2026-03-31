/**
 * 全链路回归测试数据注入脚本
 * 插入一个已完成的 mock execution，用于测试所有下游 API
 */
import pg from 'pg';

const { Pool } = pg;
const pool = new Pool({ connectionString: 'postgresql://postgres:password@localhost:5432/ai_skill_web?schema=public' });

const EXEC_ID = 'regression-test-exec-001';
const PROJECT_ID = 'cmnea152800004gm5coq0ium0';

const MOCK_STEPS = [
  {
    skillCode: 'skill-00-navigator',
    stepNumber: 0,
    inputHandoff: { user_input: '测试：AI Skill 体系构建方法论全链路验证' },
    outputHandoff: {
      schema_version: '1.1',
      from_skill: 'skill-00-navigator',
      to_skill: 'skill-01-prompt',
      payload: {
        routing_decision: 'full_pipeline',
        project_type: 'AI知识体系',
        complexity: 'high',
        recommended_mode: 'C',
        summary: '用户需要构建完整的 AI Skill 知识体系，路由至完整六层流水线'
      },
      user_action: '系统将自动执行完整流水线',
      created_at: '2026-03-31'
    },
    durationMs: 2340
  },
  {
    skillCode: 'skill-01-prompt-engineer',
    stepNumber: 1,
    inputHandoff: {
      schema_version: '1.1',
      from_skill: 'skill-00-navigator',
      to_skill: 'skill-01-prompt',
      payload: { routing_decision: 'full_pipeline' }
    },
    outputHandoff: {
      schema_version: '1.1',
      from_skill: 'skill-01-prompt',
      to_skill: 'skill-02-sop',
      payload: {
        system_prompt: '你是一名资深 AI Skill 工程师，专注于构建可复用的知识体系...',
        prompt_type: 'system_design',
        target_model: 'claude-3-5-sonnet',
        optimization_notes: ['结构化输出', '多轮对话支持', '上下文窗口优化']
      },
      user_action: '提示词已优化，继续 SOP 设计',
      created_at: '2026-03-31'
    },
    durationMs: 3150
  },
  {
    skillCode: 'skill-02-sop-engineer',
    stepNumber: 2,
    inputHandoff: {
      schema_version: '1.1',
      from_skill: 'skill-01-prompt',
      to_skill: 'skill-02-sop',
      payload: { system_prompt: '...' }
    },
    outputHandoff: {
      schema_version: '1.1',
      from_skill: 'skill-02-sop',
      to_skill: 'skill-03-scout',
      payload: {
        sop_title: 'AI Skill 体系构建 SOP v1.0',
        phases: [
          { phase: 'P1', name: '需求分析', steps: ['收集用户需求', '分类整理', '优先级排序'] },
          { phase: 'P2', name: '体系设计', steps: ['六层架构设计', '接口契约定义', '依赖关系图'] },
          { phase: 'P3', name: '开发实现', steps: ['逐层开发', '单测', '集成测试'] },
          { phase: 'P4', name: '发布验收', steps: ['文档审查', '用户测试', 'GitHub 发布'] }
        ],
        estimated_duration: '2-3 weeks'
      },
      user_action: 'SOP 已设计完成，进入开源侦察阶段',
      created_at: '2026-03-31'
    },
    durationMs: 4200
  },
  {
    skillCode: 'skill-03-scout',
    stepNumber: 3,
    inputHandoff: {
      schema_version: '1.1',
      from_skill: 'skill-02-sop',
      to_skill: 'skill-03-scout',
      payload: { sop_title: 'AI Skill 体系构建 SOP v1.0' }
    },
    outputHandoff: {
      schema_version: '1.1',
      from_skill: 'skill-03-scout',
      to_skill: 'skill-04-planner',
      payload: {
        scouted_tools: [
          { name: 'LangChain', category: 'LLM框架', score: 8.5, stars: '90k+', recommendation: '推荐用于链式调用' },
          { name: 'CrewAI', category: 'Multi-Agent', score: 8.0, stars: '20k+', recommendation: '适合多 Agent 协作' },
          { name: 'Pydantic', category: '数据验证', score: 9.0, stars: '20k+', recommendation: '强制推荐，用于数据模型' },
          { name: 'FastAPI', category: 'Web框架', score: 9.0, stars: '75k+', recommendation: '推荐用于 API 层' }
        ],
        selection_rationale: '综合考虑功能完整性、社区活跃度、文档质量',
        total_evaluated: 12
      },
      user_action: '开源工具已确定，进入执行规划',
      created_at: '2026-03-31'
    },
    durationMs: 5800
  },
  {
    skillCode: 'skill-04-planner',
    stepNumber: 4,
    inputHandoff: {
      schema_version: '1.1',
      from_skill: 'skill-03-scout',
      to_skill: 'skill-04-planner',
      payload: { scouted_tools: [] }
    },
    outputHandoff: {
      schema_version: '1.1',
      from_skill: 'skill-04-planner',
      to_skill: 'skill-05-validator',
      payload: {
        execution_plan: {
          title: 'AI Skill 体系构建执行计划',
          milestones: [
            { id: 'M1', name: '基础框架搭建', duration: '3天', tasks: ['初始化项目', '配置环境', '基础数据模型'] },
            { id: 'M2', name: '核心功能开发', duration: '5天', tasks: ['API 层开发', 'LLM 集成', '数据持久化'] },
            { id: 'M3', name: '前端 UI', duration: '4天', tasks: ['组件开发', '页面集成', '交互优化'] },
            { id: 'M4', name: '测试与发布', duration: '2天', tasks: ['单测', '集成测试', 'Docker 部署'] }
          ],
          total_duration: '14天',
          team_size: 1,
          tech_stack: ['Next.js', 'Prisma', 'PostgreSQL', 'TailwindCSS']
        }
      },
      user_action: '执行计划已生成，进入测试验收',
      created_at: '2026-03-31'
    },
    durationMs: 3900
  },
  {
    skillCode: 'skill-05-validator',
    stepNumber: 5,
    inputHandoff: {
      schema_version: '1.1',
      from_skill: 'skill-04-planner',
      to_skill: 'skill-05-validator',
      payload: { execution_plan: {} }
    },
    outputHandoff: {
      schema_version: '1.1',
      from_skill: 'skill-05-validator',
      to_skill: 'user',
      payload: {
        validation_result: 'PASS',
        score: 87,
        dimensions: [
          { name: '功能完整性', score: 90, weight: '40%', status: 'PASS' },
          { name: '文档完整性', score: 85, weight: '25%', status: 'PASS' },
          { name: '可执行性', score: 88, weight: '20%', status: 'PASS' },
          { name: '接口规范', score: 82, weight: '10%', status: 'PASS' },
          { name: '安全性', score: 90, weight: '5%', status: 'PASS' }
        ],
        p0_issues: [],
        p1_issues: [
          { severity: 'P1', description: '缺少错误重试机制文档', suggestion: '在 SOP 中补充异常处理章节' }
        ],
        recommendation: '建议在 P1 问题修复后正式发布',
        final_verdict: '项目质量合格，具备交付条件'
      },
      user_action: '验收完成，请查看完整报告',
      created_at: '2026-03-31'
    },
    durationMs: 4600
  }
];

async function run() {
  const client = await pool.connect();
  try {
    // 清理旧测试数据
    await client.query(`DELETE FROM "ExecutionStep" WHERE "executionId" = $1`, [EXEC_ID]);
    await client.query(`DELETE FROM "Execution" WHERE id = $1`, [EXEC_ID]);

    // 插入 Execution
    await client.query(`
      INSERT INTO "Execution" (id, "userInput", mode, state, "currentSkill", "apiProvider", "modelName", "councilPassed", "projectId", "createdAt", "updatedAt")
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())
    `, [
      EXEC_ID,
      '测试：AI Skill 体系构建方法论全链路验证',
      'C',
      'completed',
      null,
      'claude',
      'claude-3-5-sonnet-20241022',
      false,
      PROJECT_ID
    ]);

    // 插入 Steps
    for (const step of MOCK_STEPS) {
      const stepId = `${EXEC_ID}-step-${step.stepNumber}`;
      await client.query(`
      INSERT INTO "ExecutionStep" (id, "executionId", "stepNumber", "skillCode", status, "inputHandoff", "outputHandoff", "rawAiResponse", "durationMs", "completedAt", "createdAt")
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())
      `, [
        stepId,
        EXEC_ID,
        step.stepNumber,
        step.skillCode,
        'success',
        JSON.stringify(step.inputHandoff),
        JSON.stringify(step.outputHandoff),
        `[Mock AI Response for ${step.skillCode}] Analysis complete with structured handoff output.`,
        step.durationMs
      ]);
    }

    console.log('✅ Mock execution inserted successfully');
    console.log('EXEC_ID:', EXEC_ID);
  } finally {
    client.release();
    await pool.end();
  }
}

run().catch(e => { console.error('ERROR:', e.message); process.exit(1); });
