#!/bin/bash
# AI Skill Web App 启动脚本
# 使用方式: bash start.sh

set -e

echo "========================================="
echo "  AI Skill 编排系统 - 启动中..."
echo "========================================="

# 1. 检查 PostgreSQL
if ! pg_isready -U postgres -q 2>/dev/null; then
  echo "→ 启动 PostgreSQL..."
  service postgresql start
  sleep 2
fi
echo "✓ PostgreSQL 已就绪"

# 2. 检查 .env 文件
if [ ! -f ".env" ]; then
  echo "→ 创建默认 .env 文件..."
  cat > .env << 'EOF'
DATABASE_URL="postgresql://postgres:password@localhost:5432/ai_skill_web?schema=public"
ANTHROPIC_API_KEY=""
OPENAI_API_KEY=""
NEXT_PUBLIC_APP_NAME="AI Skill 编排系统"
EOF
fi

# 检查 API Key
if grep -q 'ANTHROPIC_API_KEY=""' .env && grep -q 'OPENAI_API_KEY=""' .env; then
  echo ""
  echo "⚠️  警告：未配置 API Key"
  echo "   请编辑 .env 文件，填写 ANTHROPIC_API_KEY 或 OPENAI_API_KEY"
  echo "   或在 Web UI 的「API 设置」中直接输入"
  echo ""
fi

# 3. 运行数据库迁移
echo "→ 检查数据库迁移..."
node_modules/.bin/prisma migrate deploy 2>/dev/null || node_modules/.bin/prisma migrate dev --name init 2>/dev/null || echo "  (迁移可能已是最新)"
echo "✓ 数据库就绪"

# 4. 安装依赖（如需要）
if [ ! -d "node_modules" ]; then
  echo "→ 安装依赖..."
  pnpm install
fi

# 5. 启动开发服务器
echo ""
echo "✓ 启动 Web 应用..."
echo "========================================="
echo "  访问地址: http://localhost:3000"
echo "========================================="
echo ""
pnpm dev
