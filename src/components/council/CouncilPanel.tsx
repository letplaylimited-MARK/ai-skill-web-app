'use client';

import { useState } from 'react';

interface CouncilVoice {
  role: string;
  verdict: 'approve' | 'reject' | 'abstain';
  key_point: string;
  confidence: number;
}

interface CouncilReport {
  final_verdict: 'APPROVE' | 'REJECT' | 'CONDITIONAL_APPROVE';
  vote_summary: { approve: number; reject: number; abstain: number };
  voices?: CouncilVoice[];
  critical_concerns?: string[];
  conditions?: string[];
  summary: string;
}

interface CouncilPanelProps {
  executionId: string;
  userInput: string;
  onApprove: () => void;
  onReject: () => void;
}

const VERDICT_STYLE = {
  APPROVE:             { label: '通过', bg: 'bg-green-900/30',  text: 'text-green-400',  border: 'border-green-700' },
  REJECT:              { label: '拒绝', bg: 'bg-red-900/30',    text: 'text-red-400',    border: 'border-red-700' },
  CONDITIONAL_APPROVE: { label: '有条件通过', bg: 'bg-amber-900/30', text: 'text-amber-400', border: 'border-amber-700' },
};

export default function CouncilPanel({ executionId, userInput, onApprove, onReject }: CouncilPanelProps) {
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState<CouncilReport | null>(null);
  const [error, setError] = useState<string | null>(null);

  const runCouncil = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/council/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ execution_id: executionId, topic: userInput }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || '圆桌审议失败');
      setReport(data.council_report);
    } catch (err) {
      setError(err instanceof Error ? err.message : '未知错误');
    } finally {
      setLoading(false);
    }
  };

  const verdictStyle = report ? VERDICT_STYLE[report.final_verdict] : null;

  return (
    <div className="space-y-6">
      <div className="text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-amber-900/30 ring-1 ring-amber-500/30 text-2xl">
          ⚖️
        </div>
        <h2 className="text-xl font-semibold text-zinc-100">圆桌审议</h2>
        <p className="mt-2 text-sm text-zinc-400">
          六位专家顾问将对您的项目需求进行多维度评审，确保执行方向正确
        </p>
      </div>

      {/* 用户输入摘要 */}
      <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 px-4 py-3">
        <p className="text-xs text-zinc-500 mb-1">待审议需求</p>
        <p className="text-sm text-zinc-300 line-clamp-3">{userInput}</p>
      </div>

      {/* 审议触发按钮 */}
      {!report && !loading && (
        <button
          onClick={runCouncil}
          className="w-full rounded-xl bg-amber-600 py-3.5 text-sm font-semibold text-white hover:bg-amber-500 transition-colors"
        >
          启动圆桌审议
        </button>
      )}

      {/* 加载状态 */}
      {loading && (
        <div className="flex flex-col items-center gap-3 py-8">
          <svg className="animate-spin h-8 w-8 text-amber-400" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          <p className="text-sm text-zinc-400">六位专家顾问正在审议中...</p>
          <p className="text-xs text-zinc-600">通常需要 15-30 秒</p>
        </div>
      )}

      {/* 错误提示 */}
      {error && (
        <div className="rounded-lg border border-red-800 bg-red-900/20 px-4 py-3 text-sm text-red-400">
          {error}
          <button onClick={runCouncil} className="ml-2 underline">重试</button>
        </div>
      )}

      {/* 审议报告 */}
      {report && verdictStyle && (
        <div className="space-y-4">
          {/* 总裁决 */}
          <div className={`rounded-xl border ${verdictStyle.border} ${verdictStyle.bg} px-5 py-4`}>
            <div className="flex items-center justify-between mb-2">
              <span className={`text-lg font-bold ${verdictStyle.text}`}>
                {verdictStyle.label}
              </span>
              <div className="flex gap-3 text-xs text-zinc-400">
                <span className="text-green-400">✓ {report.vote_summary.approve}</span>
                <span className="text-red-400">✗ {report.vote_summary.reject}</span>
                <span className="text-zinc-500">— {report.vote_summary.abstain}</span>
              </div>
            </div>
            <p className="text-sm text-zinc-300">{report.summary}</p>
          </div>

          {/* 各角色声音 */}
          {report.voices && report.voices.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-medium text-zinc-500 uppercase tracking-wider">专家意见</p>
              {report.voices.map((voice, i) => (
                <div key={i} className="flex gap-3 rounded-lg border border-zinc-800 bg-zinc-900/40 px-3 py-2.5">
                  <div className={`flex-shrink-0 text-xs font-bold mt-0.5 ${
                    voice.verdict === 'approve' ? 'text-green-400' :
                    voice.verdict === 'reject' ? 'text-red-400' : 'text-zinc-500'
                  }`}>
                    {voice.verdict === 'approve' ? '✓' : voice.verdict === 'reject' ? '✗' : '—'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-medium text-zinc-300">{voice.role}</span>
                      <span className="text-xs text-zinc-600">{(voice.confidence * 100).toFixed(0)}% 置信</span>
                    </div>
                    <p className="text-xs text-zinc-400">{voice.key_point}</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* 条件/注意事项 */}
          {report.conditions && report.conditions.length > 0 && (
            <div className="rounded-lg border border-amber-800 bg-amber-900/10 px-4 py-3">
              <p className="text-xs font-medium text-amber-400 mb-2">执行条件</p>
              <ul className="space-y-1">
                {report.conditions.map((c, i) => (
                  <li key={i} className="text-xs text-zinc-400 flex gap-2">
                    <span className="text-amber-600">•</span> {c}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* 操作按钮 */}
          <div className="flex gap-3 pt-2">
            <button
              onClick={onApprove}
              disabled={report.final_verdict === 'REJECT'}
              className="flex-1 rounded-xl bg-green-700 py-3 text-sm font-semibold text-white hover:bg-green-600 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              接受审议，开始执行
            </button>
            <button
              onClick={onReject}
              className="rounded-xl border border-zinc-700 px-5 py-3 text-sm text-zinc-400 hover:text-zinc-200 transition-colors"
            >
              取消
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
