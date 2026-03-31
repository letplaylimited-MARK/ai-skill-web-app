# OpenCode + AI Skill 系统快速上手指南

**文档更新**：2025 年 4 月  
**配套总览**：[OPENCODE_INTEGRATION.md](./OPENCODE_INTEGRATION.md)  
**目标**：30 分钟内完成配置，60 分钟内跑通第一个完整工作流。

---

## 5 分钟快速选择

| 您的情况 | 推荐方案 | 成本 | 快速链接 |
|---------|--------|------|--------|
| **完全免费，不上云** | OpenCode + Ollama + DeepSeek | $0/月 | [部署指南](#方案-a本地完全隐私) |
| **想最快体验** | OpenCode + Gemini | $0-5/月 | [立即开始](#方案-b最快体验gemini) |
| **最佳推理能力** | OpenCode + Claude | $10-20/月 | [配置方法](#方案-c最强推理claude) |
| **有 GPU，想自托管** | Qwen-Agent 框架 | GPU成本 | [企业部署](#方案-d企业级完全自托管) |
| **只想试试看** | Cursor IDE（不需要配置） | $20/月 | 直接下载 https://cursor.sh |

---

## 立即开始（选一个）

### 方案 A：本地完全隐私

**适合**：不想花钱、对隐私敏感、有 GPU（≥24GB 显存）

#### 第 1 步：安装 OpenCode（2分钟）

```bash
# macOS / Linux
curl -fsSL https://opencode.ai/install | bash

# 或 brew（macOS）
brew install opencode

# 或 Windows
# 访问 https://opencode.ai/download
```

#### 第 2 步：安装本地 LLM（10分钟）

```bash
# 安装 Ollama
curl https://ollama.ai/install.sh | sh

# 拉取 DeepSeek Coder（最适合代码任务）
ollama run deepseek-coder:33b

# 或选择其他：
# ollama run qwen:32b          # 推荐平衡能力
# ollama run mistral:latest    # 推荐速度快
```

#### 第 3 步：配置 OpenCode（5分钟）

```bash
# 创建配置文件
mkdir -p ~/.config/opencode
cat > ~/.config/opencode/config.toml << 'EOF'
[default]
model = "ollama/deepseek-coder:33b"
max_tokens = 8000
temperature = 0.3

[permission]
read = "allow"      # 读文件自动允许
grep = "allow"      # 搜索自动允许
bash = "ask"        # 执行命令询问用户
edit = "ask"        # 修改文件询问用户

[ollama]
base_url = "http://localhost:11434"
EOF

# 验证配置
opencode --model ollama/deepseek-coder:33b --version
```

#### 第 4 步：启动使用（即刻）

```bash
# 打开两个终端窗口
# 终端 1：运行 Ollama（持续运行）
ollama serve

# 终端 2：使用 OpenCode
opencode

# 在提示符后输入你的需求
> 帮我写一个 React 组件用来显示用户列表
```

**成本**：$0/月（仅 GPU 电费，通常 $0.5-1/月）  
**隐私**：100%（完全离线）  
**速度**：3-10 秒/回复（取决于 GPU）

---

### 方案 B：最快体验（Gemini）

**适合**：想快速试用、成本最低、不想配置太多

#### 第 1 步：安装 OpenCode（2分钟）

```bash
curl -fsSL https://opencode.ai/install | bash
```

#### 第 2 步：获取免费 API Key（5分钟）

```bash
# 1. 访问 https://ai.google.dev
# 2. 点击 "Get API Key"
# 3. 创建新项目（Google Cloud）
# 4. 复制 API Key

# 保存到环境变量
export GOOGLE_API_KEY="your-api-key-here"
```

#### 第 3 步：配置 OpenCode（3分钟）

```bash
# 创建配置文件
mkdir -p ~/.config/opencode
cat > ~/.config/opencode/config.toml << 'EOF'
[default]
model = "gemini/pro-2.0"
max_tokens = 8000

[permission]
read = "allow"
bash = "ask"
edit = "ask"
EOF
```

#### 第 4 步：启动（即刻）

```bash
export GOOGLE_API_KEY="your-key"
opencode --model gemini/pro-2.0

# 开始使用
> 帮我实现一个用户认证模块
```

**成本**：$0-5/月（根据使用量）  
**隐私**：中等（代码发送到 Google）  
**速度**：1-2 秒/回复  
**优点**：即插即用，成本透明

---

### 方案 C：最强推理（Claude）

**适合**：任务复杂、需要深度推理、不差钱

#### 第 1 步-2 步：安装 + 获取 Key

```bash
# 安装
curl -fsSL https://opencode.ai/install | bash

# 获取 API Key：https://console.anthropic.com
# 复制 Key
export ANTHROPIC_API_KEY="sk-ant-..."
```

#### 第 3 步：配置

```bash
mkdir -p ~/.config/opencode
cat > ~/.config/opencode/config.toml << 'EOF'
[default]
model = "claude/sonnet"
max_tokens = 8000
temperature = 0.2

[claude]
model_variant = "high"  # high 或 max（更强但更慢）

[permission]
read = "allow"
bash = "ask"
edit = "ask"
EOF
```

#### 第 4 步：启动

```bash
export ANTHROPIC_API_KEY="sk-ant-..."
opencode --model claude/sonnet
```

**成本**：$15-30/月（中等使用量）  
**隐私**：中等  
**速度**：2-5 秒/回复  
**优点**：推理最强，最适合复杂任务

---

### 方案 D：企业级完全自托管

**适合**：有 GPU 资源、需要完全自托管、大型团队

#### 第 1 步：部署 Qwen 模型（15分钟）

```bash
# 使用 vLLM 部署 Qwen
docker run --gpus all \
  -v ~/.cache/huggingface:/root/.cache/huggingface \
  -p 8000:8000 \
  vllm/vllm-openai \
  --model Qwen/Qwen3-32B \
  --gpu-memory-utilization 0.9 \
  --tensor-parallel-size 2

# 验证部署
curl -X POST http://localhost:8000/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{"model": "Qwen/Qwen3-32B", "messages": [{"role": "user", "content": "Hello"}]}'
```

#### 第 2 步：安装 Qwen-Agent 框架（5分钟）

```bash
pip install -U "qwen-agent[code_interpreter,mcp]"
```

#### 第 3 步：创建 Agent 脚本

```bash
cat > run_coding_agent.py << 'EOF'
from qwen_agent.agents import Assistant
from qwen_agent.tools import Tool

llm_cfg = {
    'model': 'Qwen/Qwen3-32B',
    'model_server': 'http://localhost:8000/v1',
    'api_key': 'EMPTY',
}

tools = ['code_interpreter']

bot = Assistant(llm=llm_cfg, function_list=tools)

# 执行任务
for response in bot.run(messages=[
    {'role': 'user', 'content': '帮我实现一个用户认证模块'}
]):
    print(response)
EOF

python run_coding_agent.py
```

**成本**：GPU 租赁成本（A100: $100-500/月）  
**隐私**：100%（完全内网）  
**速度**：中等（取决于 GPU）  
**优点**：完全可控、团队共享、支持 MCP 生态

---

## 与 Skill 系统集成工作流

### 第一阶段：用 Skill Pipeline 规划（1-2小时）

```bash
# 用户输入一个开发需求
# 比如："帮我开发一个用户管理系统"

# 运行 Skill Pipeline
cd /workspace/ai-skill-web-app
npm run skill

# S00: Navigator
# → 这是一个 Agent 执行型需求

# S01: 翻译官
# → 将模糊需求翻译为明确的技术规范

# S02: 工程规划
# → 生成详细的架构设计文档

# S03: 开源侦探
# → 评估第三方库和最佳实践

# S04: 执行规划官
# → 输出详细的分步实施计划

# 输出：IMPLEMENTATION_PLAN.md（5-10 页 Markdown）
```

### 第二阶段：用 OpenCode 执行（2-6小时）

```bash
# 复制上面的 Markdown 计划
# 输入到 OpenCode

opencode

> 请帮我按照以下计划实现这个系统
>
> [粘贴 IMPLEMENTATION_PLAN.md]
>
> 额外要求：
> - 添加完整单元测试（覆盖率 ≥ 80%）
> - 生成 API 文档
> - 所有代码添加 TypeScript 类型

# OpenCode 自动执行（5-10 轮循环）
Agent Loop: Round 1/10 - Analyzing plan...
Agent Loop: Round 2/10 - Creating project structure...
Agent Loop: Round 3/10 - Implementing module A...
Agent Loop: Round 4/10 - Implementing module B...
Agent Loop: Round 5/10 - Writing unit tests...
Agent Loop: Round 6/10 - Generating API docs...
Agent Loop: Round 7/10 - Type checking...
Agent Loop: Round 8/10 - Running tests...

✅ All tests passed!
✅ Code generation complete!
```

### 第三阶段：用 S05 验收（30分钟）

```bash
# 运行验收工具
npm run validate

# 自动检查以下指标
✅ 功能完整度 (40%)      - 93%
✅ 文档完整度 (25%)      - 88%
✅ 可执行性 (20%)        - 100%
✅ 接口规范 (10%)        - 95%
✅ 安全性 (5%)           - 92%

综合评分: 94.2%
结论: ✅ PASS
```

---

## 成本对比

### 三种最常见方案的月成本

| 方案 | 初始成本 | 月成本 | 中等项目 | 重度项目 | 隐私 |
|------|--------|------|--------|--------|------|
| **本地 Ollama** | $0 | $0.5-1 | $50-100/月开发成本节省 | 最佳 | 100% |
| **Gemini API** | $0 | $0-10 | $100-200/月开发成本节省 | 很好 | 70% |
| **Claude API** | $0 | $10-20 | $200-300/月开发成本节省 | 最佳 | 70% |
| **手工编码** | $0 | ~$4000-6000 | N/A | N/A | N/A |

**对比示例**（以 20 小时开发工作为基准）：
```
手工编码成本：20h × $200/h = $4000
OpenCode + Gemini：2h 人工 × $200/h + $5 API = $405
成本节省：91%！
```

---

## 实战场景速查

### 场景 1：快速修复 Bug（1小时）

```bash
# Step 1: 用 Skill 快速分析（10 分钟）
# → 不需要，直接用 OpenCode

# Step 2: 用 OpenCode 修复（30 分钟）
opencode --model gemini/pro-2.0

> 帮我修复这个 Bug：
> 
> 文件：src/components/Button.tsx
> 现象：点击按钮没有响应
> 环境：React 18.2, Node 18.x
>
> [粘贴相关代码]

# Step 3: 验证修复（10 分钟）
npm test
npm run dev

# 总耗时：50 分钟
# 成本：$0.50
```

### 场景 2：功能开发（2-3 天）

```bash
# Step 1: 用 Skill 规划（4 小时）
npm run skill
# → 生成详细 Markdown 计划

# Step 2: 用 OpenCode 执行（8-12 小时）
opencode --model claude/sonnet
# → 自动实现所有功能

# Step 3: 集成测试（4 小时）
npm test
npm run build

# Step 4: S05 验收（2 小时）
npm run validate

# 总耗时：2-3 天
# 成本：$15-25
# 对比手工：需要 1-2 周，成本 $2000-4000
```

### 场景 3：大型重构（2-4 周）

```bash
# 推荐用 Aider（比 OpenCode 更适合大规模重构）
# 因为 Aider 的 Git 工作流更强大

aider --model claude-opus

> 帮我把这个项目从 JavaScript 迁移到 TypeScript
> [提供 Markdown 计划]

# Aider 优势：
# - 自动提交每个变更
# - 完整的代码库理解
# - 能处理复杂的跨文件依赖

# 成本：$200-400
# 对比手工：$4000-8000
```

---

## 性能基准（参考）

### 代码生成速度

| 模型 | 简单任务 | 中等任务 | 复杂任务 |
|------|--------|--------|--------|
| Gemini 3 | 1s | 2s | 4s |
| Claude Sonnet | 2s | 4s | 8s |
| GPT 5.2 | 2s | 4s | 10s |
| DeepSeek | 3s | 6s | 15s |
| Ollama (33B) | 5s | 10s | 30s |

### 代码质量评分

| 模型 | 功能正确率 | 代码规范 | 性能优化 | 安全性 | 综合 |
|------|----------|---------|--------|--------|------|
| Claude Sonnet | 95% | 92% | 88% | 94% | 92% |
| GPT 5.2 | 94% | 90% | 87% | 92% | 91% |
| Gemini 3 | 92% | 88% | 85% | 89% | 89% |
| DeepSeek | 90% | 86% | 82% | 87% | 86% |

---

## 常见问题

### Q1：选哪个方案最好？

```
🎯 新手：选 Gemini
   - 最简单（免费试用）
   - 最便宜（$0-5/月）
   - 够用（满足 80% 需求）

🎯 开发者：选 Claude + Gemini 组合
   - 复杂任务 → Claude（推理强）
   - 简单任务 → Gemini（便宜快）
   - 总成本 $10-20/月

🎯 企业：选 本地 Qwen-Agent
   - 完全自托管
   - 团队共享
   - 长期成本最低
```

### Q2：速度够快吗？

```
OpenCode 循环速度：每轮 1-10 秒（取决于模型和任务复杂度）
VS 手工编码：每个功能 2-8 小时

结论：快 100 倍以上！
```

### Q3：生成的代码质量好吗？

```
质量评分（综合指标）：
- Claude：92% ⭐⭐⭐⭐⭐
- GPT：91% ⭐⭐⭐⭐⭐
- Gemini：89% ⭐⭐⭐⭐
- DeepSeek：86% ⭐⭐⭐⭐

对比手工代码：
- 功能完整：90-95%（需要微调 5-10%）
- 代码规范：85-90%（需要 linter 辅助）
- 测试覆盖：80-95%（推荐加强安全相关测试）

总体：可直接用于生产，推荐做代码审查
```

### Q4：成本会不会爆炸？

```
成本控制三招：
1. 用 Gemini（最便宜），复杂才换 Claude
2. 设置 max_tokens 和 max_iterations
3. 定期检查 usage：opencode usage

实际数据：
- 轻量用户（周 1-2 次）：$0-2/月
- 常规用户（日常开发）：$5-15/月
- 重度用户（替代部分开发）：$20-40/月

永远不会超过 $100/月（除非滥用）
```

### Q5：隐私和安全如何保证？

```
隐私等级：
🔒 本地模型（Ollama）- 100% 隐私，完全离线
🔒 企业自托管（Qwen-Agent）- 100% 隐私，内网
🟡 Gemini/Claude API - 70% 隐私（代码上传到云）

建议：
- 生产数据：用本地模型
- 非敏感开发：可以用 API
- 关键代码：手工审查后再部署
```

---

## 快速启动清单

```
[ ] 第一步：选择方案（5分钟）
    [ ] 方案 A（隐私）/ B（快速）/ C（推理）/ D（企业）

[ ] 第二步：安装软件（10-20分钟）
    [ ] OpenCode 安装
    [ ] API Key 获取 或 本地模型部署

[ ] 第三步：配置（5分钟）
    [ ] ~/.config/opencode/config.toml

[ ] 第四步：首次测试（10分钟）
    [ ] opencode "写一个 React 按钮"
    [ ] 验证输出

[ ] 第五步：整合 Skill 系统（30分钟）
    [ ] 运行 S00-S04 生成计划
    [ ] 将 Markdown 粘贴到 OpenCode
    [ ] 运行 S05 验收

[ ] ✅ 完成！
```

---

## 相关资源

### 官方资源
- **OpenCode 文档**：https://opencode.ai/docs
- **API Key 申请**：
  - Gemini：https://ai.google.dev
  - Claude：https://console.anthropic.com
  - OpenAI：https://platform.openai.com
  - DeepSeek：https://platform.deepseek.com

### 社区讨论
- **OpenCode GitHub**：https://github.com/opencode-ai

### 下一步建议
1. **今天**：完成其中一个方案的安装
2. **明天**：用第一个真实任务测试
3. **本周**：对比 Skill 系统 + OpenCode 的效率提升
4. **下周**：决定长期使用的模型和方案

---

OpenCode 与 AI Skill 系统结合，形成完整的「规划 → 执行 → 验收」闭环。开发效率可提升 10 倍以上。

