'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import ModeSelector from '@/components/execution/ModeSelector';
import ApiSettings from '@/components/execution/ApiSettings';
import { ExecutionMode, ApiProvider } from '@/lib/schema/types';

const EXAMPLE_PROMPTS = [
  '我想开发一个基于 RAG 的企业内部知识库问答系统，支持多轮对话',
  '帮我设计一套适合初创公司的 AI 客服系统，要低成本高效率',
  '我需要一个能自动分析竞品并生成报告的 AI Skill',
  '为我的在线教育平台构建个性化学习路径推荐 AI',
];

export default function HomePage() {
  const router = useRouter();
  const [input, setInput] = useState('');
  const [mode, setMode] = useState<ExecutionMode>('C');
  const [provider, setProvider] = useState<ApiProvider>('claude');
  const [apiKey, setApiKey] = useState('');
  const [modelName, setModelName] = useState('claude-sonnet-4-5');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/skill/initialize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_input: input.trim(),
          mode,
          api_provider: provider,
          api_key_override: apiKey || undefined,
          model_name: modelName || undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || `请求失败 (${res.status})`);
      }

      // 跳转到执行控制台
      router.push(`/execution/${data.execution_id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : '未知错误');
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-1 flex-col items-center justify-center px-4 py-12">
      {/* Hero 区域 */}
      <div className="text-center mb-10">
        <div className="inline-flex items-center gap-2 rounded-full bg-indigo-600/10 border border-indigo-500/20 px-4 py-1.5 text-xs text-indigo-400 mb-6">
          <span className="relative flex h-1.5 w-1.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-indigo-500"></span>
          </span>
          六层 AI Skill 自动化编排系统
        </div>
        <h1 className="text-4xl sm:text-5xl font-bold text-zinc-100 tracking-tight mb-4">
          描述你的 AI 项目需求
        </h1>
        <p className="text-zinc-400 text-lg max-w-2xl mx-auto leading-relaxed">
          系统将自动调度 S00 路由 → S01 提示词工程 → S02 SOP 设计 → S03 开源侦察 → S04 执行规划 → S05 测试验收，
          全流程串联无缝交接。
        </p>
      </div>

      {/* 主表单 */}
      <form onSubmit={handleSubmit} className="w-full max-w-3xl space-y-4">
        {/* 文本输入 */}
        <div className="relative">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="例如：我想构建一个能自动分析用户反馈并生成改进建议的 AI 系统..."
            rows={5}
            className="w-full resize-none rounded-xl border border-zinc-700 bg-zinc-900 px-5 py-4 text-zinc-100 placeholder-zinc-600 text-base leading-relaxed focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500/50 transition-colors"
          />
          <div className="absolute bottom-3 right-4 text-xs text-zinc-600">
            {input.length} 字符
          </div>
        </div>

        {/* 示例提示词 */}
        <div className="flex flex-wrap gap-2">
          {EXAMPLE_PROMPTS.map((prompt, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setInput(prompt)}
              className="rounded-full border border-zinc-700 bg-zinc-800/50 px-3 py-1 text-xs text-zinc-400 hover:border-zinc-600 hover:text-zinc-300 transition-colors text-left"
            >
              {prompt.slice(0, 30)}...
            </button>
          ))}
        </div>

        {/* 执行模式 */}
        <ModeSelector value={mode} onChange={setMode} />

        {/* API 设置 */}
        <ApiSettings
          provider={provider}
          onProviderChange={setProvider}
          apiKey={apiKey}
          onApiKeyChange={setApiKey}
          modelName={modelName}
          onModelNameChange={setModelName}
        />

        {/* 错误提示 */}
        {error && (
          <div className="rounded-lg border border-red-800 bg-red-900/20 px-4 py-3 text-sm text-red-400">
            <span className="font-medium">错误：</span>{error}
          </div>
        )}

        {/* 提交按钮 */}
        <button
          type="submit"
          disabled={!input.trim() || loading}
          className="w-full rounded-xl bg-indigo-600 py-4 text-base font-semibold text-white transition-all hover:bg-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-zinc-950 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              正在初始化 S00 路由分析...
            </span>
          ) : (
            '启动 AI Skill 流水线'
          )}
        </button>
      </form>

      {/* 流程说明 */}
      <div className="mt-16 w-full max-w-3xl">
        <p className="text-center text-xs text-zinc-600 mb-6 uppercase tracking-wider">六层 Skill 执行流程</p>
        <div className="flex items-center justify-between gap-1">
          {[
            { code: 'S00', name: '路由', color: 'bg-purple-600' },
            { code: 'S01', name: '提示词', color: 'bg-blue-600' },
            { code: 'S02', name: 'SOP', color: 'bg-cyan-600' },
            { code: 'S03', name: '开源侦察', color: 'bg-green-600' },
            { code: 'S04', name: '规划', color: 'bg-amber-600' },
            { code: 'S05', name: '验收', color: 'bg-red-600' },
          ].map((s, i, arr) => (
            <div key={s.code} className="flex items-center gap-1 flex-1">
              <div className="flex-1 flex flex-col items-center gap-1">
                <div className={`${s.color} rounded-md w-full py-2 text-center text-xs font-bold text-white`}>
                  {s.code}
                </div>
                <span className="text-xs text-zinc-600">{s.name}</span>
              </div>
              {i < arr.length - 1 && (
                <svg className="h-3 w-3 text-zinc-600 flex-shrink-0 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
