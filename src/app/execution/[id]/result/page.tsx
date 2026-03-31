'use client';

import { useEffect, useState, use } from 'react';
import { useRouter } from 'next/navigation';

interface StepSummary {
  skillCode: string;
  status: string;
  durationMs?: number | null;
  outputHandoff?: Record<string, unknown> | null;
}

interface ExecutionSummary {
  id: string;
  userInput: string;
  mode: string;
  state: string;
  apiProvider: string;
  createdAt: string;
  steps: StepSummary[];
  councilReport?: Record<string, unknown> | null;
  finalReport?: string | null;
}

const SKILL_META: Record<string, string> = {
  'skill-00-navigator':       'S00 · 路由导航',
  'skill-01-prompt-engineer': 'S01 · 提示词工程',
  'skill-02-sop-engineer':    'S02 · SOP 工程',
  'skill-03-scout':           'S03 · 开源侦察',
  'skill-04-planner':         'S04 · 执行规划',
  'skill-05-validator':       'S05 · 测试验收',
};

export default function ResultPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [execution, setExecution] = useState<ExecutionSummary | null>(null);
  const [markdownReport, setMarkdownReport] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [exportLoading, setExportLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'handoffs' | 'markdown'>('overview');

  useEffect(() => {
    const load = async () => {
      try {
        const [execRes, exportRes] = await Promise.all([
          fetch(`/api/execution/${id}`),
          fetch(`/api/export/${id}?format=json`),
        ]);
        const execData = await execRes.json();
        const exportData = await exportRes.json();

        setExecution(execData.execution);
        setMarkdownReport(exportData.markdown_report || '');
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id]);

  const handleDownload = async (format: 'json' | 'markdown') => {
    setExportLoading(true);
    try {
      // markdown 格式直接获取纯文本，json 格式解析 JSON
      let content: string;
      const mime = format === 'markdown' ? 'text/markdown' : 'application/json';
      const ext = format === 'markdown' ? 'md' : 'json';
      if (format === 'markdown') {
        const res = await fetch(`/api/export/${id}?format=markdown`);
        content = await res.text();
      } else {
        const res = await fetch(`/api/export/${id}?format=json`);
        const data = await res.json();
        content = JSON.stringify(data, null, 2);
      }
      // keep original variable names to avoid restructuring
      void mime; void ext;

      const blobMime = format === 'markdown' ? 'text/markdown' : 'application/json';
      const blobExt = format === 'markdown' ? 'md' : 'json';
      const blob = new Blob([content], { type: blobMime });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `ai-skill-execution-${id.slice(0, 8)}.${blobExt}`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setExportLoading(false);
    }
  };

  const totalDuration = execution?.steps.reduce((sum, s) => sum + (s.durationMs || 0), 0) || 0;
  const successCount = execution?.steps.filter((s) => s.status === 'success').length || 0;

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <svg className="animate-spin h-6 w-6 text-indigo-400" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      </div>
    );
  }

  if (!execution) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <p className="text-zinc-400">执行记录不存在</p>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-8">
      {/* 返回 */}
      <button
        onClick={() => router.push(`/execution/${id}`)}
        className="flex items-center gap-1.5 text-sm text-zinc-500 hover:text-zinc-300 transition-colors mb-6"
      >
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        返回执行控制台
      </button>

      {/* 标题区 */}
      <div className="flex items-start justify-between gap-6 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-zinc-100 mb-2">执行结果报告</h1>
          <p className="text-sm text-zinc-500 line-clamp-2">{execution.userInput}</p>
        </div>
        <div className="flex gap-2 flex-shrink-0">
          <button
            onClick={() => handleDownload('markdown')}
            disabled={exportLoading}
            className="rounded-lg border border-zinc-700 px-3 py-2 text-xs text-zinc-400 hover:text-zinc-200 transition-colors flex items-center gap-1.5"
          >
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Markdown
          </button>
          <button
            onClick={() => handleDownload('json')}
            disabled={exportLoading}
            className="rounded-lg border border-zinc-700 px-3 py-2 text-xs text-zinc-400 hover:text-zinc-200 transition-colors flex items-center gap-1.5"
          >
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            JSON
          </button>
        </div>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-4 gap-3 mb-8">
        {[
          { label: '执行步骤', value: `${successCount}/${execution.steps.length}`, sub: '成功/总计' },
          { label: '总耗时', value: `${(totalDuration / 1000).toFixed(1)}s`, sub: '端到端' },
          { label: '执行模式', value: `模式 ${execution.mode}`, sub: execution.apiProvider },
          { label: '状态', value: execution.state === 'completed' ? '✓ 完成' : execution.state, sub: new Date(execution.createdAt).toLocaleDateString('zh-CN') },
        ].map((card) => (
          <div key={card.label} className="rounded-xl border border-zinc-800 bg-zinc-900/50 px-4 py-3">
            <p className="text-xs text-zinc-500 mb-1">{card.label}</p>
            <p className="text-base font-semibold text-zinc-100">{card.value}</p>
            <p className="text-xs text-zinc-600">{card.sub}</p>
          </div>
        ))}
      </div>

      {/* Tab 导航 */}
      <div className="flex gap-1 rounded-lg border border-zinc-800 bg-zinc-900/30 p-1 mb-6">
        {([
          { key: 'overview', label: '执行概览' },
          { key: 'handoffs', label: '交接包链' },
          { key: 'markdown', label: 'Markdown 报告' },
        ] as const).map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex-1 rounded-md py-2 text-sm font-medium transition-colors ${
              activeTab === tab.key
                ? 'bg-zinc-700 text-zinc-100'
                : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab 内容 */}
      {activeTab === 'overview' && (
        <div className="space-y-3">
          {execution.steps.map((step, i) => (
            <div
              key={i}
              className={`rounded-xl border px-5 py-4 ${
                step.status === 'success'
                  ? 'border-green-800/50 bg-green-900/10'
                  : step.status === 'error'
                  ? 'border-red-800/50 bg-red-900/10'
                  : 'border-zinc-800 bg-zinc-900/40'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-zinc-200">
                  {SKILL_META[step.skillCode] || step.skillCode}
                </span>
                <div className="flex items-center gap-3">
                  {step.durationMs && (
                    <span className="text-xs text-zinc-500">{(step.durationMs / 1000).toFixed(1)}s</span>
                  )}
                  <span className={`text-xs font-medium ${
                    step.status === 'success' ? 'text-green-400' :
                    step.status === 'error' ? 'text-red-400' : 'text-zinc-500'
                  }`}>
                    {step.status === 'success' ? '✓ 完成' : step.status === 'error' ? '✗ 错误' : step.status}
                  </span>
                </div>
              </div>
              {/* 简要输出摘要 */}
              {step.outputHandoff && (
                <div className="text-xs text-zinc-500 font-mono truncate">
                  {JSON.stringify(step.outputHandoff).slice(0, 120)}...
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {activeTab === 'handoffs' && (
        <div className="space-y-4">
          {execution.steps
            .filter((s) => s.outputHandoff)
            .map((step, i) => (
              <div key={i} className="space-y-1">
                <p className="text-xs font-medium text-zinc-500">
                  {SKILL_META[step.skillCode] || step.skillCode} → 输出
                </p>
                <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 overflow-hidden">
                  <pre className="overflow-auto p-3 text-xs text-zinc-300 font-mono max-h-60">
                    {JSON.stringify(step.outputHandoff, null, 2)}
                  </pre>
                </div>
              </div>
            ))}
        </div>
      )}

      {activeTab === 'markdown' && (
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 overflow-hidden">
          <div className="border-b border-zinc-800 px-4 py-2 flex items-center justify-between">
            <span className="text-xs text-zinc-500">Markdown 报告</span>
            <button
              onClick={() => {
                navigator.clipboard.writeText(markdownReport);
              }}
              className="text-xs text-zinc-500 hover:text-zinc-300"
            >
              复制
            </button>
          </div>
          <pre className="overflow-auto p-5 text-xs text-zinc-300 font-mono whitespace-pre-wrap max-h-[600px] leading-relaxed">
            {markdownReport || '报告生成中...'}
          </pre>
        </div>
      )}
    </div>
  );
}
