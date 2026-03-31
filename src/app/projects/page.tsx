'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface ExecutionSummary {
  id: string;
  state: string;
  mode: string;
  apiProvider: string;
  userInput: string;
  createdAt: string;
}

interface ProjectItem {
  id: string;
  title: string;
  description: string | null;
  mode: string;
  createdAt: string;
  executions: ExecutionSummary[];
  _count: { executions: number };
}

const STATE_STYLE: Record<string, string> = {
  completed:   'bg-green-900/30 text-green-400',
  in_progress: 'bg-blue-900/30 text-blue-400',
  pending:     'bg-zinc-800 text-zinc-400',
  failed:      'bg-red-900/30 text-red-400',
};

export default function ProjectsPage() {
  const router = useRouter();
  const [projects, setProjects] = useState<ProjectItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const loadProjects = async (p = 1) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/projects?page=${p}&limit=10`);
      const data = await res.json();
      setProjects(data.projects || []);
      setTotalPages(data.pagination?.total_pages || 1);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadProjects(page); }, [page]);

  const handleDelete = async (id: string) => {
    if (!confirm('确认删除该项目及所有执行记录？')) return;
    setDeleteId(id);
    try {
      await fetch(`/api/projects/${id}`, { method: 'DELETE' });
      loadProjects(page);
    } finally {
      setDeleteId(null);
    }
  };

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-zinc-100 mb-1">执行历史</h1>
          <p className="text-sm text-zinc-500">所有 AI Skill 编排执行记录</p>
        </div>
        <Link
          href="/"
          className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500 transition-colors"
        >
          新建执行
        </Link>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <svg className="animate-spin h-6 w-6 text-indigo-400" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        </div>
      ) : projects.length === 0 ? (
        <div className="text-center py-20">
          <div className="text-4xl mb-4">📭</div>
          <p className="text-zinc-400 mb-2">暂无执行记录</p>
          <p className="text-sm text-zinc-600 mb-6">在首页输入需求，启动第一个 AI Skill 流水线</p>
          <Link
            href="/"
            className="rounded-xl bg-indigo-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-indigo-500 transition-colors"
          >
            立即开始
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {projects.map((project) => (
            <div
              key={project.id}
              className="rounded-xl border border-zinc-800 bg-zinc-900/50 hover:border-zinc-700 transition-colors overflow-hidden"
            >
              <div className="flex items-start justify-between gap-4 px-5 py-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-sm font-medium text-zinc-200 truncate">{project.title}</h3>
                    <span className="flex-shrink-0 rounded-full bg-zinc-800 px-2 py-0.5 text-xs text-zinc-500">
                      模式 {project.mode}
                    </span>
                  </div>
                  {project.description && (
                    <p className="text-xs text-zinc-500 mb-2 line-clamp-1">{project.description}</p>
                  )}
                  <div className="text-xs text-zinc-600">
                    {project._count.executions} 次执行 · {new Date(project.createdAt).toLocaleDateString('zh-CN', { year: 'numeric', month: 'short', day: 'numeric' })}
                  </div>
                </div>
                <button
                  onClick={() => handleDelete(project.id)}
                  disabled={deleteId === project.id}
                  className="flex-shrink-0 text-zinc-600 hover:text-red-400 transition-colors p-1"
                  title="删除项目"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>

              {/* 执行记录列表 */}
              {project.executions.length > 0 && (
                <div className="border-t border-zinc-800/70">
                  {project.executions.map((exec) => (
                    <button
                      key={exec.id}
                      onClick={() => router.push(`/execution/${exec.id}`)}
                      className="w-full flex items-center gap-3 px-5 py-3 hover:bg-zinc-800/30 transition-colors text-left border-b border-zinc-800/40 last:border-b-0"
                    >
                      <span className={`flex-shrink-0 rounded-full px-2 py-0.5 text-xs ${STATE_STYLE[exec.state] || STATE_STYLE.pending}`}>
                        {exec.state === 'completed' ? '已完成' : exec.state === 'in_progress' ? '进行中' : exec.state === 'failed' ? '失败' : '等待中'}
                      </span>
                      <span className="flex-1 text-xs text-zinc-400 truncate">{exec.userInput}</span>
                      <span className="flex-shrink-0 text-xs text-zinc-600">
                        {new Date(exec.createdAt).toLocaleDateString('zh-CN')}
                      </span>
                      <svg className="h-3.5 w-3.5 text-zinc-600 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                  ))}
                  {project._count.executions > project.executions.length && (
                    <div className="px-5 py-2 text-xs text-zinc-600">
                      + {project._count.executions - project.executions.length} 条更多记录
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* 分页 */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-8">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="rounded-md border border-zinc-700 px-3 py-1.5 text-sm text-zinc-400 hover:text-zinc-200 disabled:opacity-40 transition-colors"
          >
            上一页
          </button>
          <span className="text-sm text-zinc-500">{page} / {totalPages}</span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="rounded-md border border-zinc-700 px-3 py-1.5 text-sm text-zinc-400 hover:text-zinc-200 disabled:opacity-40 transition-colors"
          >
            下一页
          </button>
        </div>
      )}
    </div>
  );
}
