# AI Skill Web App — 多阶段 Docker 构建
# Stage 1: 依赖安装
FROM node:22-alpine AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

# 安装 pnpm
RUN npm install -g pnpm@9

# 复制 package 文件
COPY package.json pnpm-lock.yaml* ./
COPY prisma ./prisma/

# 安装依赖（仅生产依赖）
RUN pnpm install --frozen-lockfile --prod=false

# Stage 2: 构建
FROM node:22-alpine AS builder
WORKDIR /app
RUN npm install -g pnpm@9

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# 生成 Prisma Client
RUN pnpm exec prisma generate

# 构建 Next.js 应用
ENV NEXT_TELEMETRY_DISABLED=1
ENV DATABASE_URL=postgresql://placeholder:placeholder@localhost:5432/placeholder
ENV ANTHROPIC_API_KEY=placeholder-for-build
ENV OPENAI_API_KEY=placeholder-for-build

RUN pnpm build

# Stage 3: 生产运行时
FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# 安全：创建非 root 用户
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# 安装 pnpm（用于运行 prisma migrate deploy）
RUN npm install -g pnpm@9

# 复制必要文件
COPY --from=builder /app/public ./public
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/pnpm-lock.yaml ./pnpm-lock.yaml

# 复制构建产物（设置正确权限）
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# 安装仅 prisma 运行时依赖
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=builder /app/node_modules/prisma ./node_modules/prisma
COPY --from=builder /app/node_modules/pg ./node_modules/pg
COPY --from=builder /app/node_modules/@prisma/adapter-pg ./node_modules/@prisma/adapter-pg

# 复制 skill prompt 文件（运行时需要）
COPY --from=builder /app/src/lib/skill-prompts ./src/lib/skill-prompts

USER nextjs

EXPOSE 3000

# 启动脚本：先运行 prisma migrate deploy，再启动应用
CMD ["node", "server.js"]
