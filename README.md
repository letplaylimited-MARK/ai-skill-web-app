# AI Skill 编排系统

> 将六层 AI Skill 体系串联成可视化流水线的 Next.js Web 应用

[![Next.js](https://img.shields.io/badge/Next.js-16.2-black?logo=next.js)](https://nextjs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue?logo=typescript)](https://www.typescriptlang.org)
[![Prisma](https://img.shields.io/badge/Prisma-7.x-2D3748?logo=prisma)](https://www.prisma.io)
[![TailwindCSS](https://img.shields.io/badge/TailwindCSS-4.x-06B6D4?logo=tailwindcss)](https://tailwindcss.com)

---

## 项目简介

本系统将以下六个 AI Skill 角色串联为自动化流水线：

| Skill | 角色 | 职责 |
|-------|------|------|
| S00 | 路由导航官 | 解构需求，决定执行路径 |
| S01 | 提示词工程师 | 优化 Prompt，精准表达意图 |
| S02 | SOP 工程师 | 设计可复用的标准化流程 |
| S03 | 开源侦察官 | 评估开源工具，技术选型 |
| S04 | 执行规划官 | 制定分阶段可操作计划 |
| S05 | 测试验收工程师 | 质量检验，输出验收报告 |

支持全自动流水线（模式 C）和人工审核介入（模式 A/B/D/E），并内置**六角色圆桌预检机制**（模式 D/E）。

---

## 功能特性

- **五种执行模式**：从单 Skill 试验到全自动六层流水线
- **圆桌审议**：六个 AI 角色同时评估需求风险（P0 门控）
- **步进审批**：每步 Skill 完成后可查看、编辑交接包再继续
- **双格式导出**：Markdown 报告 + 完整 JSON 数据包
- **项目管理**：多项目、多次执行历史管理
- **双 AI 引擎**：Claude（Anthropic）和 GPT（OpenAI）可切换

---

## 快速开始

### 环境要求

- Node.js 18+
- PostgreSQL 14+
- pnpm（推荐）

### 安装步骤

```bash
# 1. 克隆仓库
git clone https://github.com/letplaylimited-MARK/ai-skill-web-app.git
cd ai-skill-web-app

# 2. 安装依赖
pnpm install

# 3. 配置环境变量
cp .env.example .env
# 编辑 .env，填入数据库连接和 AI API Key
```

### 环境变量配置（`.env`）

```env
DATABASE_URL="postgresql://postgres:password@localhost:5432/ai_skill_web"

# 至少填一个 AI API Key
ANTHROPIC_API_KEY="sk-ant-..."
OPENAI_API_KEY="sk-..."

NEXT_PUBLIC_APP_NAME="AI Skill 编排系统"
NEXT_PUBLIC_APP_VERSION="1.0.0"
```

### 初始化数据库

```bash
npx prisma generate
npx prisma db push
```

### 启动开发服务器

```bash
pnpm dev
# 访问 http://localhost:3000
```

### 生产构建

```bash
pnpm build
pnpm start
```

---

## 执行模式说明

| 模式 | 名称 | 行为 |
|------|------|------|
| **A** | 单 Skill | 只执行 S00，完成后停止 |
| **B** | 协调官模式 | 每个 Skill 完成后需人工确认再继续 |
| **C** | 全自动流水线 | S00→S01→S02→S03→S04→S05 全自动串联 |
| **D** | 圆桌 + 单跑 | 先圆桌审议，通过后执行 S00 |
| **E** | 深度精炼 | 圆桌审议 + 每步人工审批 |

---

## 技术架构

```
src/
├── app/                    # Next.js App Router 页面与 API
│   ├── page.tsx            # 首页（需求输入）
│   ├── execution/[id]/     # 执行控制台 + 圆桌审议 + 结果报告
│   ├── projects/           # 项目管理
│   └── api/                # 后端 API 路由
├── components/             # React 组件
│   ├── execution/          # 执行相关组件
│   └── council/            # 圆桌审议组件
└── lib/
    ├── db.ts               # Prisma 数据库客户端
    ├── llm-gateway.ts      # AI API 统一调用层
    └── skill-prompts/      # 六个 Skill 的系统提示词
```

**核心依赖**：Next.js 16 · Prisma v7 + @prisma/adapter-pg · TailwindCSS 4 · @anthropic-ai/sdk · openai

---

## AI 智能体开发者

如果你是 AI 编码智能体（OpenCode、Claude Code、Cursor 等），请先阅读：

- **[AGENT.md](./AGENT.md)** — 项目引导文件（架构、API 契约、关键约定）
- **[CONTEXT.md](./CONTEXT.md)** — 架构决策历史（ADR）
- **[ROADMAP.md](./ROADMAP.md)** — 迭代优先级与任务卡片

---

## 相关项目

本项目是 [AI Skill 体系](https://github.com/letplaylimited-MARK/ai-skill-system) 的 Web 操作平台实现。

---

## License

MIT
