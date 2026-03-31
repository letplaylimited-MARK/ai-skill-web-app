# AGENT.md — AI Skill Web App 智能体引导文件

> **本文件专为 AI 编码智能体（OpenCode / Claude Code / Cursor Agent 等）设计。**
> 请在开始任何任务前完整阅读此文件，它包含项目架构、运行方式、关键约定和当前开发状态。

---

## 项目一句话描述

**AI Skill 编排系统** — 一个 Next.js 16 Web 应用，将六个 AI Skill 角色（路由官、提示词工程师、SOP 工程师、开源侦察官、执行规划官、测试验收工程师）串联成可视化流水线，支持全自动执行（模式 C）和人工审核介入（模式 A/B/D/E）。

---

## 快速启动（首要任务）

```bash
# 1. 安装依赖
pnpm install

# 2. 配置环境变量（必须）
cp .env.example .env
# 编辑 .env，填入以下内容：
# DATABASE_URL="postgresql://postgres:password@localhost:5432/ai_skill_web"
# ANTHROPIC_API_KEY="sk-ant-..."   ← 或者 OPENAI_API_KEY
# NEXT_PUBLIC_APP_NAME="AI Skill 编排系统"

# 3. 初始化数据库
npx prisma generate
npx prisma db push

# 4. 启动开发服务器
pnpm dev

# 5. 访问
open http://localhost:3000
```

> **重要**：数据库使用 Prisma v7 + @prisma/adapter-pg（pg 适配器模式），不是传统 DATABASE_URL 直连模式。如果遇到 `PrismaClientInitializationError`，检查 `src/lib/db.ts` 中的 Pool 初始化是否正确。

---

## 技术栈一览

| 层级 | 技术 | 版本 | 备注 |
|------|------|------|------|
| 框架 | Next.js App Router | 16.2.1 | Turbopack，全部用 `ƒ` 动态路由 |
| 语言 | TypeScript | 5.x | 严格模式，`strict: true` |
| 数据库 | PostgreSQL + Prisma | 7.x | 必须用 `PrismaPg` adapter |
| ORM | Prisma | v7 | `@prisma/adapter-pg` + `pg.Pool` |
| 样式 | TailwindCSS | 4.x | 暗色主题，`zinc` 色板 |
| AI SDK | @anthropic-ai/sdk + openai | latest | 服务端调用，绝不在前端暴露 key |
| 图标 | lucide-react | latest | |
| UI 原语 | @radix-ui/react-dialog, @radix-ui/react-tabs | latest | |

---

## 目录结构详解

```
src/
├── app/                          ← Next.js App Router 页面
│   ├── page.tsx                  ← 首页：需求输入表单
│   ├── layout.tsx                ← 根布局（导航栏 + 页脚）
│   ├── globals.css               ← 全局 Tailwind 样式
│   ├── execution/[id]/
│   │   ├── page.tsx              ← 执行控制台（核心页面）
│   │   ├── council/page.tsx      ← 圆桌审议页面（模式 D/E）
│   │   └── result/page.tsx       ← 结果报告页面
│   ├── projects/page.tsx         ← 项目管理页面
│   └── api/                      ← 所有后端 API（Server Components）
│       ├── execution/[id]/route.ts   ← GET 执行状态 / DELETE 删除
│       ├── export/[id]/route.ts      ← GET 导出（?format=json|markdown）
│       ├── council/run/route.ts      ← POST 六角色圆桌审议
│       ├── projects/route.ts         ← GET 项目列表 / POST 创建项目
│       ├── projects/[id]/route.ts    ← GET/PUT/DELETE 项目详情
│       ├── skill/initialize/route.ts ← POST 初始化流水线（创建 Execution）
│       └── skill/execute/route.ts    ← POST 执行指定 Skill 步骤
│
├── components/
│   ├── execution/
│   │   ├── SkillPanel.tsx        ← 单个 Skill 执行卡片（含审批按钮）
│   │   ├── ExecutionTrace.tsx    ← 顶部进度条（6 步可视化）
│   │   ├── ModeSelector.tsx      ← 执行模式选择器（A/B/C/D/E）
│   │   ├── ApiSettings.tsx       ← API 提供商和 Key 配置
│   │   ├── HandoffViewer.tsx     ← 交接包 JSON 查看器
│   │   └── Navbar.tsx            ← （注：实际在 layout/ 目录）
│   ├── council/
│   │   └── CouncilPanel.tsx      ← 圆桌审议面板（六角色意见展示）
│   └── layout/
│       └── Navbar.tsx            ← 顶部导航
│
└── lib/
    ├── db.ts                     ← Prisma 客户端（单例，含 PrismaPg adapter）
    ├── llm-gateway.ts            ← AI 调用层（Claude/OpenAI 统一接口）
    ├── schema/
    │   └── types.ts              ← 所有 TypeScript 类型定义
    └── skill-prompts/
        ├── s00.txt               ← Skill 00 · 路由导航官 系统提示词
        ├── s01.txt               ← Skill 01 · 提示词工程师 系统提示词
        ├── s02.txt               ← Skill 02 · SOP 工程师 系统提示词
        ├── s03.txt               ← Skill 03 · 开源侦察官 系统提示词
        ├── s04.txt               ← Skill 04 · 执行规划官 系统提示词
        └── s05.txt               ← Skill 05 · 测试验收工程师 系统提示词
```

---

## 数据库模型（核心）

```prisma
model Project {
  id          String      @id @default(cuid())
  title       String
  description String?
  mode        String      @default("C")     // A|B|C|D|E
  createdAt   DateTime    @default(now())
  updatedAt   DateTime    @updatedAt
  executions  Execution[]
}

model Execution {
  id             String          @id @default(cuid())
  projectId      String?
  userInput      String
  mode           String          @default("C")
  state          String          @default("pending")  // pending|in_progress|completed|failed
  currentSkill   String?
  councilPassed  Boolean         @default(false)
  apiProvider    String          @default("claude")   // claude|openai
  modelName      String?
  steps          ExecutionStep[]
  councilReport  Json?           // CouncilPackage JSON
  finalReport    String?         // 最终 Markdown 报告
  createdAt      DateTime        @default(now())
  updatedAt      DateTime        @updatedAt
}

model ExecutionStep {
  id            String    @id @default(cuid())
  executionId   String
  stepNumber    Int
  skillCode     String    // skill-00-navigator | skill-01-prompt-engineer | ...
  status        String    @default("pending")  // pending|running|success|error
  inputHandoff  Json
  outputHandoff Json?
  rawAiResponse String?
  errorMessage  String?
  durationMs    Int?
  createdAt     DateTime  @default(now())
  completedAt   DateTime?
}
```

---

## API 契约（关键）

### `GET /api/execution/:id`
```json
{
  "execution": {
    "id": "...",
    "userInput": "...",
    "mode": "C",
    "state": "completed",
    "currentSkill": null,
    "councilPassed": false,
    "apiProvider": "claude",
    "steps": [
      {
        "id": "...",
        "stepNumber": 0,
        "skillCode": "skill-00-navigator",
        "status": "success",
        "inputHandoff": { ... },
        "outputHandoff": { ... },
        "durationMs": 2340
      }
    ]
  }
}
```
> ⚠️ **必须有 `{ execution: ... }` 包装层**，前端所有页面均依赖 `data.execution`。

### `POST /api/skill/initialize`
- 请求体：`{ user_input, mode, api_provider, model_name?, api_key_override? }`
- 返回：`{ execution_id, current_handoff, next_action, next_skill? }`

### `POST /api/skill/execute`
- Query 参数：`?execution_id=xxx&skill_code=skill-01-prompt-engineer`
- 请求体（可选）：`{ user_edited_handoff?, api_key_override? }`
- 返回：`{ execution_id, step_id, next_skill?, output_handoff, is_complete, needs_user_approval }`

### `POST /api/council/run`
- 请求体：`{ execution_id, topic, api_key_override? }`
  - ⚠️ `execution_id` 必须在 **body** 中（不是 query 参数）
  - ⚠️ 主题字段支持 `topic` 或 `user_input` 两种名称
- 返回：`{ council_report, council_package, p0_gate, decision, can_proceed }`

### `GET /api/export/:id`
- `?format=json` → 返回 JSON：`{ execution, handoff_chain, markdown_report }`
- `?format=markdown` → 返回 `text/markdown` 纯文本（**不是 JSON**，用 `res.text()` 读取）

---

## 执行模式说明

| 模式 | 名称 | 行为 |
|------|------|------|
| A | 单 Skill | 只执行 S00，完成后停止，等待用户 |
| B | 协调官模式 | 每个 Skill 执行完后停下来，需用户确认 |
| C | 全自动流水线 | S00→S01→S02→S03→S04→S05 全自动串联 |
| D | 圆桌 + 单 Skill | 先圆桌审议，通过后仅执行 S00 |
| E | 深度精炼 | 先圆桌审议，通过后逐步执行（每步审批） |

---

## 关键代码约定

### Prisma 客户端必须用 adapter 模式
```typescript
// src/lib/db.ts — 不要改这个！
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
export const prisma = new PrismaClient({ adapter });
```

### Next.js 16 动态路由参数是 Promise
```typescript
// 必须 await params，不能直接解构
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;  // ← 必须 await
}
```

### 客户端页面用 `use()` 解包 params
```typescript
// 客户端页面
export default function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);  // ← use() 而非 await
}
```

### 执行锁必须用 useRef（不是 useState）
```typescript
// execution/[id]/page.tsx — 避免 stale closure
const executingRef = useRef(false);
// 不要改成 useState，会导致异步回调中读到旧值
```

---

## Skill 流水线顺序

```
skill-00-navigator
  → skill-01-prompt-engineer
    → skill-02-sop-engineer
      → skill-03-scout
        → skill-04-planner
          → skill-05-validator
            → user (完成)
```

每个 Skill 的系统提示词在 `src/lib/skill-prompts/s0X.txt`，可以独立修改以调整 AI 行为。

---

## 当前项目状态（交接时）

- **已完成**：所有核心功能均已实现并通过全链路回归测试（17/17 用例通过）
- **线上测试**：在无真实 API Key 的环境下完成模拟验证
- **待验证**：使用真实 `ANTHROPIC_API_KEY` 或 `OPENAI_API_KEY` 进行端到端 AI 调用测试
- **参考文档**：见项目根目录的 `CONTEXT.md`（架构决策）和 `ROADMAP.md`（迭代方向）

---

## 常见问题速查

| 症状 | 原因 | 解法 |
|------|------|------|
| `PrismaClientInitializationError` | 未用 adapter 模式 | 检查 `db.ts`，确保用 `PrismaPg` |
| 前端显示"加载执行记录失败" | API 返回裸对象而非 `{ execution }` | 检查 `api/execution/[id]/route.ts` 第 23 行 |
| 圆桌审议始终报"execution_id 必填" | `execution_id` 未在 body 中 | 确认 `CouncilPanel.tsx` 发送方式 |
| `result` 页面白屏 | 用 `.json()` 读取了 markdown 响应 | `?format=json` 用 `.json()`，`?format=markdown` 用 `.text()` |
| 自动执行死锁 | `useState` 执行锁被旧闭包捕获 | 改用 `useRef(false)` |
| `params is not a function` | Next.js 16 params 是 Promise | Server 端用 `await params`，Client 端用 `use(params)` |
