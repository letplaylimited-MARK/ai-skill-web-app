import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { rateLimit, getClientIp } from '@/lib/rate-limit';
import { sanitizeString, validateLength } from '@/lib/validate';

// GET /api/projects — 获取所有项目及其执行记录
export async function GET(request: NextRequest) {
  // SEC-001: 速率限制 — 每 IP 每分钟最多 60 次读请求
  const clientIp = getClientIp(request);
  const rl = rateLimit(clientIp, { max: 60, windowMs: 60_000, prefix: 'projects-get' });
  if (!rl.success) {
    return NextResponse.json(
      { error: '请求过于频繁，请稍后再试' },
      { status: 429, headers: { 'Retry-After': String(Math.ceil((rl.resetAt - Date.now()) / 1000)) } }
    );
  }

  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const skip = (page - 1) * limit;

    const [projects, total] = await Promise.all([
      prisma.project.findMany({
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: {
          executions: {
            orderBy: { createdAt: 'desc' },
            take: 5, // 每个项目最多返回最近 5 条执行记录
            select: {
              id: true,
              state: true,
              mode: true,
              apiProvider: true,
              createdAt: true,
              updatedAt: true,
              userInput: true,
              currentSkill: true,
              councilPassed: true,
            },
          },
          _count: { select: { executions: true } },
        },
      }),
      prisma.project.count(),
    ]);

    return NextResponse.json({
      projects,
      pagination: {
        page,
        limit,
        total,
        total_pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('[GET /api/projects] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch projects', details: String(error) },
      { status: 500 }
    );
  }
}

// POST /api/projects — 创建新项目
export async function POST(request: NextRequest) {
  // SEC-001: 速率限制 — 每 IP 每分钟最多 10 次创建请求（防止垃圾数据）
  const clientIp = getClientIp(request);
  const rl = rateLimit(clientIp, { max: 10, windowMs: 60_000, prefix: 'projects-post' });
  if (!rl.success) {
    return NextResponse.json(
      { error: '创建请求过于频繁，请稍后再试' },
      { status: 429, headers: { 'Retry-After': String(Math.ceil((rl.resetAt - Date.now()) / 1000)) } }
    );
  }

  try {
    const body = await request.json();
    const { title: rawTitle, description: rawDesc, mode } = body;

    // SEC-002: 输入校验 — title 必须是 1–100 字符的合法字符串
    const title = validateLength(sanitizeString(rawTitle, 100), 1, 100);
    if (!title) {
      return NextResponse.json(
        { error: 'Project title is required and must be 1-100 characters' },
        { status: 400 }
      );
    }

    // SEC-002: 净化 description（可选，最多 500 字符）
    const description = rawDesc ? sanitizeString(rawDesc, 500) || null : null;

    const validModes = ['A', 'B', 'C', 'D', 'E'];
    const projectMode = validModes.includes(mode) ? mode : 'C';

    const project = await prisma.project.create({
      data: {
        title: title,
        description: description,
        mode: projectMode,
      },
    });

    return NextResponse.json({ project }, { status: 201 });
  } catch (error) {
    console.error('[POST /api/projects] Error:', error);
    return NextResponse.json(
      { error: 'Failed to create project', details: String(error) },
      { status: 500 }
    );
  }
}
