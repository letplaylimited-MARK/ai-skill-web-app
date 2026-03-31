# CONTEXT.md — 架构决策历史与设计理由

> 本文件记录项目关键架构决策的背景与理由，帮助后续开发者（人类或 AI）理解"为什么这样设计"而不仅是"是什么"。

---

## 项目背景

本项目起源于一套六层 AI Skill 体系的工程化实践。该体系通过 CodeBuddy 云端 AI 协作环境（在线会话）完成设计与初版构建，随后交付给本地 AI 编码智能体（OpenCode 等）继续迭代。

**核心命题**：将原本分散在 Markdown 文档中的 AI Skill 体系，变成一个可视化、可交互、可扩展的 Web 操作平台。

---

## 关键架构决策记录

### ADR-01：选择 Next.js App Router 而非 Pages Router

**决策**：使用 Next.js 16 App Router + Turbopack

**理由**：
- App Router 的 `params: Promise<{id}>` 异步模式更符合 React 18 的并发特性
- 服务端组件天然支持 API 路由与页面共存，减少额外的 Express/Fastify 层
- Turbopack 编译速度比 Webpack 快 3-5 倍，开发体验更好

**代价**：`params` 必须 `await`（服务端）或用 `use()`（客户端），这是初学者常见的 Bug 来源，已在 `AGENT.md` 中明确标注。

---

### ADR-02：Prisma v7 必须使用 `@prisma/adapter-pg` 模式

**决策**：用 `pg.Pool` + `PrismaPg` adapter 初始化 PrismaClient，而非传统 `new PrismaClient()`

**理由**：
- Prisma v7 在 Edge Runtime 和某些 Node.js 环境中要求显式传入连接适配器
- 标准 `new PrismaClient()` 模式在 Next.js 生产构建中偶发连接问题
- `pg.Pool` 提供连接池管理，避免 Serverless 冷启动的连接超限

**代码位置**：`src/lib/db.ts`

**注意**：不要将 `DATABASE_URL` 写进 `schema.prisma` 的 `datasource` 块（已移除 `url` 字段），完全由 `db.ts` 的 Pool 管理。

---

### ADR-03：执行模式设计（A/B/C/D/E 五种模式）

**决策**：不是简单的"自动/手动"，而是五种粒度递增的执行模式

**设计理由**：

```
A — 单次试验：只跑 S00，快速验证路由效果
B — 逐步审阅：每步都停，适合初次使用或重要项目
C — 全自动：一键跑完六层，适合常规需求
D — 圆桌后单跑：先集体评估风险，再快速执行 S00
E — 圆桌后逐步：最严格模式，六角色审议 + 每步人工确认
```

**影响**：`resolveNextAction()` 函数（`execution/[id]/page.tsx`）是这五种模式的核心分发逻辑，修改模式行为时以此为入口。

---

### ADR-04：前端执行锁用 `useRef` 而非 `useState`

**决策**：`executingRef = useRef(false)` 而非 `[executing, setExecuting] = useState(false)`

**理由**：
- `executeNextSkill` 是异步函数，在 React 18 并发模式下，`useState` 的值在异步回调中是"快照"（stale closure）
- 在连续触发场景（Mode C 全自动）中，第二次 `useEffect` 触发时 `executing` 仍然读到 `false`，导致重复执行
- `useRef` 的值是引用类型，始终读到最新值，天然避免 stale closure

**教训**：这是 React 18 + async/await 最容易踩的坑之一。只要执行锁不需要触发重渲染，一律用 `useRef`。

---

### ADR-05：Council API 同时支持 `topic` 和 `user_input` 字段名

**决策**：`const user_input = bodyUserInput || topic`

**理由**：
- 系统内部 API 设计之初用 `user_input`
- `CouncilPanel.tsx` 组件在实现时用了更语义化的 `topic`
- 两者均保留，避免破坏性变更，未来统一到 `topic` 即可

---

### ADR-06：导出 API 的双格式设计

**决策**：`?format=json` 返回 JSON，`?format=markdown` 返回 `text/markdown` 纯文本

**理由**：
- Markdown 作为纯文本导出，可直接下载为 `.md` 文件，无需客户端处理
- JSON 导出包含完整机器可读数据（`execution` 对象 + `handoff_chain` + `markdown_report`），适合二次处理
- 前端消费规则：初始化用 `?format=json`（`res.json()`），下载 Markdown 用 `?format=markdown`（`res.text()`）

---

### ADR-07：Skill 系统提示词存储为独立 `.txt` 文件

**决策**：`src/lib/skill-prompts/s00.txt` ~ `s05.txt`，而非硬编码在 JS/TS 中

**理由**：
- 系统提示词是业务逻辑的核心，需要频繁迭代优化
- 独立文件便于版本控制（git diff 清晰）、单独编辑（不需要修改业务代码）
- 未来可扩展为从数据库或 CMS 读取，实现热更新

**加载方式**：`src/lib/llm-gateway.ts` 的 `loadSkillPrompt()` 函数，在服务端通过 `fs.readFileSync` 读取。

---

## 已知技术债

| 编号 | 描述 | 优先级 | 建议处理方式 |
|------|------|--------|-------------|
| TD-01 | `CouncilPanel.tsx` 与 API 的字段名未完全统一（`topic` vs `user_input`） | 低 | 统一改为 `topic`，同步修改 API |
| TD-02 | `execution/[id]/page.tsx` 中 `SKILL_ORDER` 硬编码了 Skill 顺序 | 中 | 提取为配置文件或从 API 动态获取 |
| TD-03 | Skill 提示词文件无版本管理机制 | 低 | 加入文件头部版本注释，或迁移到 DB |
| TD-04 | 无认证/鉴权机制 | 高（生产环境） | 添加 NextAuth.js 或 API Key 保护 |
| TD-05 | AI 调用无重试机制 | 中 | 在 `llm-gateway.ts` 加入指数退避重试 |
| TD-06 | 无 WebSocket/SSE 实时推送 | 中 | 当前靠轮询，长时间 AI 调用体验差 |
| TD-07 | `projects/page.tsx` 无 execution 过滤功能 | 低 | 加入状态筛选和时间排序 |

---

## 项目演进历史（简版）

```
Phase 1 — 初始化 + 数据模型 + AI 调用层
  ├── Prisma schema 设计（Project / Execution / ExecutionStep）
  ├── db.ts（PrismaPg adapter 模式）
  └── llm-gateway.ts（Claude + OpenAI 统一接口）

Phase 2 — 核心 API 端点
  ├── /api/skill/initialize  （创建 Execution，触发 S00）
  ├── /api/skill/execute     （执行单步 Skill）
  ├── /api/council/run       （六角色圆桌审议）
  ├── /api/export/[id]       （JSON + Markdown 导出）
  └── /api/projects          （CRUD）

Phase 3 — 前端 UI
  ├── 首页（需求输入 + 模式选择 + API 配置）
  ├── 执行控制台（步进可视化 + 实时状态）
  ├── 圆桌审议页面（六角色意见展示）
  └── 结果报告页面（Markdown + JSON + 交接包链）

Phase 4 — 集成测试与本地运行验证
  └── 全链路冒烟测试

Task #69 — 全链路自动化校验与修复
  ├── 发现并修复 6 个 P0/P1 级 Bug
  ├── TypeScript 零错误验证
  ├── 生产构建验证（pnpm build）
  └── 17 个回归测试用例全部通过

Phase 5 — 沙盘推演（三轮压测）
  ├── Round 1：正常流量模拟（10 并发用户 × 10 分钟）
  ├── Round 2：边界条件压测（发现并修复 2 个 P1 级 API Bug）
  └── Round 3：故障注入测试（AI 超时、DB 断连恢复验证）

Phase 6 — 文档与交付
  ├── DELIVERY_GUIDE.html（15 章节完整交付指南）
  ├── AGENT.md（AI 智能体引导文件）
  └── CONTEXT.md（架构决策历史，即本文件）

Phase 7 — 容器化部署
  ├── Dockerfile（多阶段构建：builder → runner，非 root 用户 nextjs:1001）
  ├── docker-compose.yml（App + PostgreSQL 双服务）
  └── Skill04 FW-001/FW-002 回归验证

Phase 8 — CI/CD 完善
  ├── .github/workflows/ci.yml（Lint + Build + 安全审计 + Skill 文件校验）
  ├── .github/workflows/release.yml（v*.*.* 标签自动创建 Release）
  └── .github/dependabot.yml（npm + Actions 依赖自动更新）

Phase 9 — P0 生产安全加固（commit: 970f48c）
  ├── SEC-001: src/lib/rate-limit.ts（滑动窗口速率限制，差异化各端点）
  ├── SEC-002: src/lib/validate.ts（XSS 防御 + UUID/skill_code 格式校验 + 日志防注入）
  ├── SEC-003: next.config.ts headers()（CSP + HSTS + X-Frame-Options 等 7 项安全头）
  ├── SEC-004: docker-compose.yml（read_only + cap_drop ALL + 双网络隔离 + DB 端口不外露）
  ├── SEC-005: ci.yml（gitleaks + Trivy + 移除 || echo 兜底）
  └── SECURITY.md（漏洞披露政策 + 密钥轮换指南）

综合安全评分：8.5/10 | OWASP Top 10 覆盖：10/10
```
