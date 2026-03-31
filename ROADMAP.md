# ROADMAP.md — 迭代方向与功能优先级

> 本文件定义项目下一阶段的开发方向。适合在 OpenCode 本地环境中作为新任务的起点。

---

## 当前版本状态：v1.0.0（基础可用版）

**已具备**：
- 六层 Skill 全自动流水线（模式 C）
- 人工审核模式（A/B/E）
- 圆桌预检机制（D/E）
- 项目管理（CRUD）
- JSON + Markdown 双格式报告导出
- PostgreSQL 数据持久化

**尚不具备**（见下方路线图）：
- 用户认证
- 实时执行推送（SSE/WebSocket）
- AI 调用流式输出
- 多模型动态切换
- Skill 提示词在线编辑

---

## P0 — 生产上线必须项

### P0-1：用户认证与 API Key 管理

**背景**：当前系统完全无认证，任何人访问都可以消费 AI API 额度。

**建议方案**：
```
选项 A（快速）：NextAuth.js + GitHub OAuth
选项 B（自托管）：lucia-auth + 邮箱密码
选项 C（企业）：Clerk.dev（托管认证服务）
```

**实现要点**：
- API Key 应加密存储于数据库，与用户绑定，而非放在 `.env`
- `resolveApiKey()` 函数需改为从会话中读取用户 key，`api_key_override` 降级为开发调试用

**文件影响**：
- `src/lib/llm-gateway.ts` — `resolveApiKey()`
- `src/app/layout.tsx` — 添加 SessionProvider
- 新增 `src/app/api/auth/[...nextauth]/route.ts`

---

### P0-2：AI 调用流式输出（Streaming）

**背景**：当前 AI 调用为阻塞式，一次完整调用可能需要 30-60 秒，前端无任何进度反馈，用户体验极差。

**建议方案**：Server-Sent Events（SSE）

```typescript
// 伪代码：stream 版 skill/execute
const stream = await anthropic.messages.stream({...});
const encoder = new TextEncoder();
const readable = new ReadableStream({
  async start(controller) {
    for await (const chunk of stream) {
      controller.enqueue(encoder.encode(`data: ${JSON.stringify(chunk)}\n\n`));
    }
    controller.close();
  }
});
return new Response(readable, {
  headers: { 'Content-Type': 'text/event-stream' }
});
```

**前端**：`ExecutionStep` 卡片中实时显示 AI 输出文字，而非等待完成后一次性显示。

---

### P0-3：AI 调用错误重试机制

**背景**：当 Claude/OpenAI API 因限速或临时故障返回错误时，系统直接将步骤标记为 `error` 并停止。

**建议方案**：在 `llm-gateway.ts` 中加入指数退避重试：

```typescript
async function callWithRetry(fn: () => Promise<string>, maxRetries = 3): Promise<string> {
  for (let i = 0; i < maxRetries; i++) {
    try { return await fn(); }
    catch (err) {
      if (i === maxRetries - 1) throw err;
      await new Promise(r => setTimeout(r, Math.pow(2, i) * 1000));
    }
  }
}
```

---

## P1 — 重要功能增强

### P1-1：Skill 提示词在线编辑器

**背景**：Skill 的系统提示词当前是 `.txt` 文件，修改需要直接编辑代码，不适合非技术用户。

**建议方案**：
- 新增 `/settings/prompts` 页面，展示六个 Skill 的提示词
- 允许在线编辑并保存到数据库（新增 `SkillPrompt` 模型）
- 版本历史：记录每次修改，支持回滚

**数据库变更**：
```prisma
model SkillPrompt {
  id         String   @id @default(cuid())
  skillCode  String   // skill-00-navigator 等
  content    String   @db.Text
  version    Int      @default(1)
  isActive   Boolean  @default(true)
  createdAt  DateTime @default(now())
  updatedAt  DateTime @updatedAt
}
```

---

### P1-2：执行历史与对比分析

**背景**：同一个需求用不同模式或提示词运行多次后，无法横向对比结果差异。

**建议功能**：
- 在 `/projects/[id]` 页面展示所有 execution 的对比视图
- 支持将两次 execution 的 Markdown 报告并排展示
- 标记哪次执行质量更好（用户评分 1-5 星）

---

### P1-3：多模型动态路由

**背景**：当前只支持 Claude 和 OpenAI，且每次执行只能选一个。

**建议方案**：
- 支持 Ollama（本地模型）：`llm-gateway.ts` 新增 `callOllama()` 分支
- 支持 Gemini：`@google/generative-ai` SDK
- **Skill 级模型配置**：不同 Skill 可以用不同模型（如 S00 用快速模型，S05 用最强模型）

```typescript
// 未来的 ModelConfig
interface SkillModelConfig {
  skillCode: SkillCode;
  provider: 'claude' | 'openai' | 'ollama' | 'gemini';
  model: string;
  temperature?: number;
}
```

---

### P1-4：Webhook 与外部集成

**背景**：企业用户希望在 Execution 完成后自动通知外部系统（Slack、飞书、Jira 等）。

**建议方案**：
- 新增 `Webhook` 模型（url、events、secret）
- Execution 状态变更时触发 `POST` 到注册的 webhook URL
- 支持事件：`execution.completed`、`execution.failed`、`council.p0_blocked`

---

## P2 — 体验优化

### P2-1：实时协作（多人同时查看同一 Execution）

**方案**：Liveblocks 或 Partykit 提供 WebSocket 协作基础设施

### P2-2：移动端适配

**当前状态**：PC 端优先设计，移动端布局未优化
**建议**：ExecutionTrace 改为垂直步进条，SkillPanel 折叠展示

### P2-3：暗/亮主题切换

**当前状态**：固定暗色主题（`zinc` 色板）
**建议**：添加 `next-themes`，支持系统主题跟随

### P2-4：执行进度实时动画

**建议**：在 `ExecutionTrace.tsx` 中，当前步骤显示打字机动画效果，已完成步骤显示打勾动画

---

## P3 — 长期方向

### P3-1：Skill 市场（Marketplace）

允许用户创建自定义 Skill（除了内置的六层），并发布到共享市场供其他用户使用。

### P3-2：团队协作空间

多用户共享同一个 Project，支持评论、任务分配、审批工作流。

### P3-3：API 对外开放

将 `POST /api/skill/initialize` 包装为 RESTful API，提供 API Key 认证，允许第三方系统触发 AI Skill 流水线。

### P3-4：私有化部署包

提供 Docker Compose 一键部署方案：

```yaml
# docker-compose.yml 草稿
services:
  app:
    build: .
    ports: ["3000:3000"]
    depends_on: [db]
    environment:
      DATABASE_URL: postgresql://postgres:password@db:5432/ai_skill_web
  db:
    image: postgres:16
    volumes: ["pgdata:/var/lib/postgresql/data"]
volumes:
  pgdata:
```

---

## 开始下一个 Sprint 的建议顺序

如果你是在 OpenCode 中打开此项目准备继续开发，建议按以下顺序处理：

```
1. pnpm install && npx prisma generate && pnpm dev   ← 先让项目跑起来
2. 配置 .env，填入真实的 ANTHROPIC_API_KEY           ← 端到端验证 AI 调用
3. 运行 node scripts/insert-mock-execution.mjs       ← 注入测试数据
4. 访问 http://localhost:3000 手动验证核心流程        ← 冒烟测试
5. 选择 ROADMAP 中的一个 P0/P1 任务开始迭代          ← 正式开发
```

---

## 任务卡片模板（OpenCode 任务格式）

以下是为 OpenCode 智能体准备的标准任务描述格式：

```markdown
## 任务：实现 P0-2 AI 调用流式输出

**背景**：当前 /api/skill/execute 是阻塞调用，30-60秒无反馈。
**目标**：改为 SSE 流式返回，前端实时展示 AI 打字效果。

**涉及文件**：
- src/lib/llm-gateway.ts  ← 新增 executeSkillViaLlmStream()
- src/app/api/skill/execute/route.ts  ← 返回 ReadableStream
- src/components/execution/SkillPanel.tsx  ← 接收 SSE 并更新 UI

**验收标准**：
- [ ] 执行 Skill 时，SkillPanel 卡片中实时出现 AI 输出文字
- [ ] 流结束后自动更新步骤状态为 success/error
- [ ] 非流式模式作为 fallback 保留（兼容旧代码）
```
