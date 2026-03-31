import type { NextConfig } from "next";

const securityHeaders = [
  // 防止点击劫持
  {
    key: "X-Frame-Options",
    value: "DENY",
  },
  // 防止 MIME 类型嗅探
  {
    key: "X-Content-Type-Options",
    value: "nosniff",
  },
  // 强制 HTTPS（1 年，包含子域名）
  {
    key: "Strict-Transport-Security",
    value: "max-age=31536000; includeSubDomains; preload",
  },
  // 控制 Referer 头泄露
  {
    key: "Referrer-Policy",
    value: "strict-origin-when-cross-origin",
  },
  // 限制浏览器功能
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), browsing-topics=()",
  },
  // 禁用 XSS 过滤器（现代浏览器推荐设 0，依赖 CSP）
  {
    key: "X-XSS-Protection",
    value: "0",
  },
  // 内容安全策略（SEC-003）
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'", // Next.js 开发需要，生产可去掉 unsafe-eval
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob:",
      "font-src 'self'",
      "connect-src 'self'",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "upgrade-insecure-requests",
    ].join("; "),
  },
];

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        // 对所有路由应用安全头
        source: "/(.*)",
        headers: securityHeaders,
      },
    ];
  },

  // 生产构建优化
  poweredByHeader: false, // 隐藏 X-Powered-By: Next.js

  // 严格模式（帮助发现潜在问题）
  reactStrictMode: true,
};

export default nextConfig;
