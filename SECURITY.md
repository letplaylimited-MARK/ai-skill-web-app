# Security Policy

## Supported Versions

| Version | Supported |
|---------|-----------|
| latest (main) | ✅ |
| older branches | ❌ |

---

## Reporting a Vulnerability

**请勿在公开 Issue 中报告安全漏洞。**

### 报告流程

1. **发送邮件**至安全团队：`security@your-org.com`
2. **主题格式**：`[SECURITY] <简短描述> - AI-Skill-Web-App`
3. **邮件内容应包含**：
   - 漏洞类型（如 XSS、SQL 注入、信息泄露等）
   - 受影响的组件/端点
   - 重现步骤（最小化 PoC）
   - 潜在影响评估
   - 发现者信息（可匿名）

### 响应时效

| 阶段 | 时效 |
|------|------|
| 确认收到 | 24 小时内 |
| 初步评估 | 72 小时内 |
| 修复完成（Critical） | 7 天内 |
| 修复完成（High） | 30 天内 |
| 公开披露 | 修复后 90 天内 |

---

## API Key 与 Secrets 轮换指南

### 何时必须轮换

- 怀疑密钥泄露（代码、日志、截图中出现）
- 人员离职或权限变更
- 定期轮换（建议每 90 天）
- CI/CD 流水线配置变更

### 轮换步骤

#### 1. Anthropic API Key

```bash
# 1. 登录 https://console.anthropic.com → API Keys → 创建新 Key
# 2. 更新生产环境变量
export ANTHROPIC_API_KEY=sk-ant-new-key-here

# 3. 更新 GitHub Secrets
gh secret set ANTHROPIC_API_KEY --body "$ANTHROPIC_API_KEY"

# 4. 重启服务
docker compose restart app

# 5. 撤销旧 Key（在 Anthropic 控制台）
```

#### 2. OpenAI API Key

```bash
# 1. 登录 https://platform.openai.com → API Keys → 创建新 Key
# 2. 更新环境变量并重启服务（同上）
# 3. 在 OpenAI 控制台撤销旧 Key
```

#### 3. NEXTAUTH_SECRET

```bash
# 生成新的 32 字节随机 Secret
openssl rand -base64 32

# 更新 .env.production 和 docker-compose 环境变量
# 注意：更新后所有用户会话将失效，需重新登录
```

#### 4. 数据库密码（PostgreSQL）

```bash
# 1. 在新密码生效前确保应用停机
docker compose stop app

# 2. 修改数据库密码
docker compose exec db psql -U ai_skill -c "ALTER USER ai_skill PASSWORD 'new-password';"

# 3. 更新环境变量 POSTGRES_PASSWORD 和 DATABASE_URL

# 4. 重启服务
docker compose up -d
```

---

## 安全配置核查清单

在每次部署前确认：

- [ ] `.env` 文件不在 Git 仓库中（`.gitignore` 已配置）
- [ ] Docker 镜像不包含 `.env` 文件（`.dockerignore` 已配置）
- [ ] 所有 API Key 通过环境变量注入，非硬编码
- [ ] `NEXTAUTH_SECRET` 已设置为强随机值（非默认值）
- [ ] 数据库端口 5432 未对外网暴露
- [ ] 容器以非 root 用户运行（UID 1001）
- [ ] CI 安全审计通过（无 CRITICAL 漏洞）

---

## 安全联系方式

- **安全团队邮箱**：`security@your-org.com`
- **PGP 公钥**：[可选，提供 PGP 公钥指纹]
- **漏洞赏金计划**：[如有，提供链接]

---

## 已知安全加固记录

| 编号 | 类型 | 说明 | 状态 |
|------|------|------|------|
| SEC-001 | 速率限制 | 滑动窗口 API 限速，防暴力攻击 | ✅ 已实施 |
| SEC-002 | 输入校验 | XSS/注入防护，sanitizeString 等 | ✅ 已实施 |
| SEC-003 | 安全响应头 | CSP/HSTS/X-Frame-Options 等 | ✅ 已实施 |
| SEC-004 | Secrets 扫描 | gitleaks CI 集成 | ✅ 已实施 |
| SEC-005 | 依赖漏洞 | pnpm audit CRITICAL 阻断 | ✅ 已实施 |
| SEC-006 | 硬编码检测 | CI grep 模式匹配 | ✅ 已实施 |
| SEC-007 | 镜像扫描 | Trivy CRITICAL/HIGH 阻断 | ✅ 已实施 |
| SEC-008 | 网络隔离 | DB 端口不对外暴露 | ✅ 已实施 |
| SEC-009 | 容器加固 | read_only + no-new-privileges | ✅ 已实施 |
| SEC-010 | 网络分段 | frontend/backend 双网络隔离 | ✅ 已实施 |
