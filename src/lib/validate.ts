/**
 * SEC-002: 输入校验与净化工具
 * 防止 XSS、SQL 注入、路径穿越等注入攻击
 */

/** 移除 HTML 标签并截断字符串，防止 XSS */
export function sanitizeString(input: unknown, maxLength = 1000): string {
  if (typeof input !== 'string') return '';
  return input
    .replace(/<[^>]*>/g, '')          // 去除 HTML 标签
    .replace(/[<>"'`]/g, '')          // 去除危险字符
    .trim()
    .slice(0, maxLength);
}

/** 校验 execution ID（仅允许 UUID v4 格式） */
export function validateExecutionId(id: unknown): string | null {
  if (typeof id !== 'string') return null;
  const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return UUID_RE.test(id) ? id : null;
}

/** 校验 skill 代码（仅允许 s00–s99 格式） */
export function validateSkillCode(code: unknown): string | null {
  if (typeof code !== 'string') return null;
  const SKILL_RE = /^s\d{2}$/;
  return SKILL_RE.test(code) ? code : null;
}

/** 校验 project ID（正整数字符串） */
export function validateProjectId(id: unknown): number | null {
  const n = Number(id);
  if (!Number.isInteger(n) || n <= 0 || n > 2_147_483_647) return null;
  return n;
}

/** 校验 URL 是否为允许的协议（防止 javascript: 等） */
export function validateUrl(url: unknown): string | null {
  if (typeof url !== 'string') return null;
  try {
    const parsed = new URL(url);
    if (!['http:', 'https:'].includes(parsed.protocol)) return null;
    return parsed.toString();
  } catch {
    return null;
  }
}

/** 校验 JSON body 字段必须存在且类型正确 */
export function requireFields<T extends object>(
  body: unknown,
  fields: (keyof T)[]
): body is T {
  if (typeof body !== 'object' || body === null) return false;
  return fields.every((f) => f in (body as object));
}

/** 校验字符串长度范围 */
export function validateLength(
  value: unknown,
  min: number,
  max: number
): string | null {
  if (typeof value !== 'string') return null;
  if (value.length < min || value.length > max) return null;
  return value;
}

/** 净化用于日志输出的字符串（防止日志注入） */
export function sanitizeForLog(input: unknown): string {
  if (typeof input !== 'string') return String(input).slice(0, 200);
  return input.replace(/[\r\n\t]/g, ' ').slice(0, 200);
}
