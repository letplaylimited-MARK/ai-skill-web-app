import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { rateLimit, getClientIp } from '@/lib/rate-limit';
import { sanitizeString } from '@/lib/validate';

type RouteContext = { params: Promise<{ id: string }> };

// GET /api/projects/[id] — 获取单个项目及所有执行记录
export async function GET(request: NextRequest, context: RouteContext) {
  // SEC-001: 速率限制
  const clientIp = getClientIp(request);
  const rl = rateLimit(clientIp, { max: 60, windowMs: 60_000, prefix: 'proj-id-get' });
  if (!rl.success) {
    return NextResponse.json({ error: '请求过于频繁' }, { status: 429 });
  }

  try {
    const { id } = await context.params;

    const project = await prisma.project.findUnique({
      where: { id },
      include: {
        executions: {
          orderBy: { createdAt: 'desc' },
          include: {
            steps: {
              orderBy: { stepNumber: 'asc' },
              select: {
                id: true,
                stepNumber: true,
                skillCode: true,
                status: true,
                durationMs: true,
                createdAt: true,
                completedAt: true,
              },
            },
          },
        },
        _count: { select: { executions: true } },
      },
    });

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    return NextResponse.json({ project });
  } catch (error) {
    console.error('[GET /api/projects/[id]] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch project', details: String(error) },
      { status: 500 }
    );
  }
}

// PATCH /api/projects/[id] — 更新项目信息
export async function PATCH(request: NextRequest, context: RouteContext) {
  // SEC-001: 速率限制
  const clientIp = getClientIp(request);
  const rl = rateLimit(clientIp, { max: 20, windowMs: 60_000, prefix: 'proj-id-patch' });
  if (!rl.success) {
    return NextResponse.json({ error: '请求过于频繁' }, { status: 429 });
  }

  try {
    const { id } = await context.params;
    const body = await request.json();
    const { title: rawTitle, description: rawDesc, mode } = body;

    const existing = await prisma.project.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    const validModes = ['A', 'B', 'C', 'D', 'E'];
    const updateData: Record<string, unknown> = {};
    // SEC-002: 对所有可写字段做安全消毒
    if (rawTitle && typeof rawTitle === 'string') {
      const title = sanitizeString(rawTitle, 100);
      if (title) updateData.title = title;
    }
    if (rawDesc !== undefined) {
      updateData.description = rawDesc ? sanitizeString(rawDesc, 500) || null : null;
    }
    if (mode && validModes.includes(mode)) {
      updateData.mode = mode;
    }

    const project = await prisma.project.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({ project });
  } catch (error) {
    console.error('[PATCH /api/projects/[id]] Error:', error);
    return NextResponse.json(
      { error: 'Failed to update project', details: String(error) },
      { status: 500 }
    );
  }
}

// DELETE /api/projects/[id] — 删除项目（级联删除所有执行记录和步骤）
export async function DELETE(_request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;

    const existing = await prisma.project.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    // 先手动删除子级（Execution → ExecutionStep 通过 cascade）
    const executions = await prisma.execution.findMany({
      where: { projectId: id },
      select: { id: true },
    });
    const executionIds = executions.map((e) => e.id);

    await prisma.executionStep.deleteMany({
      where: { executionId: { in: executionIds } },
    });

    await prisma.execution.deleteMany({
      where: { projectId: id },
    });

    await prisma.project.delete({ where: { id } });

    return NextResponse.json({ success: true, deleted_project_id: id });
  } catch (error) {
    console.error('[DELETE /api/projects/[id]] Error:', error);
    return NextResponse.json(
      { error: 'Failed to delete project', details: String(error) },
      { status: 500 }
    );
  }
}
