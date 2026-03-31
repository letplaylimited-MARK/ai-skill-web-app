/**
 * SEC-001: API 速率限制工具
 * 基于内存滑动窗口算法，防止 API 暴力调用和 DDoS
 */

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

// 内存存储（生产建议换 Redis）
const store = new Map<string, RateLimitEntry>();

// 定期清理过期条目，防止内存泄漏
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of store.entries()) {
    if (now > entry.resetAt) store.delete(key);
  }
}, 60_000);

export interface RateLimitConfig {
  /** 时间窗口（毫秒），默认 60s */
  windowMs?: number;
  /** 窗口内最大请求数，默认 60 */
  max?: number;
  /** 标识符前缀，用于区分不同端点 */
  prefix?: string;
}

export interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  resetAt: number;
}

/**
 * 检查指定 key 是否超出速率限制
 */
export function rateLimit(
  key: string,
  config: RateLimitConfig = {}
): RateLimitResult {
  const { windowMs = 60_000, max = 60, prefix = 'rl' } = config;
  const storeKey = `${prefix}:${key}`;
  const now = Date.now();

  let entry = store.get(storeKey);

  if (!entry || now > entry.resetAt) {
    entry = { count: 1, resetAt: now + windowMs };
    store.set(storeKey, entry);
  } else {
    entry.count += 1;
  }

  return {
    success: entry.count <= max,
    limit: max,
    remaining: Math.max(0, max - entry.count),
    resetAt: entry.resetAt,
  };
}

/**
 * 从请求中提取客户端 IP
 */
export function getClientIp(request: Request): string {
  const headers = request.headers;
  return (
    headers.get('x-real-ip') ??
    headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    headers.get('cf-connecting-ip') ??
    'unknown'
  );
}
