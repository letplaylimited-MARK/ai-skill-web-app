import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

// GET /api/projects — 获取所有项目及其执行记录
export async function GET(request: NextRequest) {
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
  try {
    const body = await request.json();
    const { title, description, mode } = body;

    if (!title || typeof title !== 'string' || title.trim() === '') {
      return NextResponse.json(
        { error: 'Project title is required' },
        { status: 400 }
      );
    }

    const validModes = ['A', 'B', 'C', 'D', 'E'];
    const projectMode = validModes.includes(mode) ? mode : 'C';

    const project = await prisma.project.create({
      data: {
        title: title.trim(),
        description: description?.trim() || null,
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
