'use client';

import { useState } from 'react';
import HandoffViewer from './HandoffViewer';

interface Step {
  id: string;
  stepNumber: number;
  skillCode: string;
  status: 'pending' | 'running' | 'success' | 'error';
  inputHandoff: Record<string, unknown>;
  outputHandoff?: Record<string, unknown> | null;
  rawAiResponse?: string | null;
  errorMessage?: string | null;
  durationMs?: number | null;
}

interface SkillPanelProps {
  step: Step;
  isActive: boolean;
  needsApproval: boolean;
  onApprove: (editedHandoff?: Record<string, unknown>) => void;
  onSkip: () => void;
}

const SKILL_META: Record<string, { name: string; color: string; icon: string }> = {
  'skill-00-navigator':       { name: 'S00 · 路由导航',     color: 'text-purple-400',  icon: '🧭' },
  'skill-01-prompt-engineer': { name: 'S01 · 提示词工程',   color: 'text-blue-400',    icon: '✍️' },
  'skill-02-sop-engineer':    { name: 'S02 · SOP 工程',     color: 'text-cyan-400',    icon: '📐' },
  'skill-03-scout':           { name: 'S03 · 开源侦察',     color: 'text-green-400',   icon: '🔍' },
  'skill-04-planner':         { name: 'S04 · 执行规划',     color: 'text-amber-400',   icon: '🗓️' },
  'skill-05-validator':       { name: 'S05 · 测试验收',     color: 'text-red-400',     icon: '✅' },
};

const STATUS_CONFIG = {
  pending: { label: '等待中', bg: 'bg-zinc-700', text: 'text-zinc-400', ring: 'ring-zinc-700' },
  running: { label: '执行中', bg: 'bg-blue-900/40', text: 'text-blue-400', ring: 'ring-blue-500/50' },
  success: { label: '完成', bg: 'bg-green-900/30', text: 'text-green-400', ring: 'ring-green-500/50' },
  error:   { label: '错误', bg: 'bg-red-900/30',   text: 'text-red-400',   ring: 'ring-red-500/50' },
};

export default function SkillPanel({ step, isActive, needsApproval, onApprove, onSkip }: SkillPanelProps) {
  const [showInput, setShowInput] = useState(false);
  const [showOutput, setShowOutput] = useState(false);
  const [showRaw, setShowRaw] = useState(false);
  const [editedHandoff, setEditedHandoff] = useState<Record<string, unknown> | null>(null);

  const meta = SKILL_META[step.skillCode] || { name: step.skillCode, color: 'text-zinc-400', icon: '🤖' };
  const statusCfg = STATUS_CONFIG[step.status];

  return (
    <div
      className={`rounded-xl border transition-all ${
        isActive
          ? `border-indigo-500/50 ring-1 ring-indigo-500/20 ${statusCfg.bg}`
          : 'border-zinc-800 bg-zinc-900/40'
      }`}
    >
      {/* 头部 */}
      <div className="flex items-center gap-3 px-4 py-3">
        <div className={`flex h-8 w-8 items-center justify-center rounded-full ring-1 ${statusCfg.ring} text-base`}>
          {step.status === 'running' ? (
            <svg className="animate-spin h-4 w-4 text-blue-400" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          ) : (
            <span>{meta.icon}</span>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className={`text-sm font-medium ${meta.color}`}>{meta.name}</div>
          <div className="text-xs text-zinc-500">
            步骤 {step.stepNumber + 1}
            {step.durationMs != null && ` · ${(step.durationMs / 1000).toFixed(1)}s`}
          </div>
        </div>
        <span
          className={`rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ${statusCfg.ring} ${statusCfg.text} bg-transparent`}
        >
          {statusCfg.label}
        </span>
      </div>

      {/* 执行详情 */}
      {(step.status === 'success' || step.status === 'running' || step.status === 'error') && (
        <div className="border-t border-zinc-800 px-4 py-3 space-y-2">
          {/* 错误信息 */}
          {step.errorMessage && (
            <div className="rounded-md bg-red-900/20 border border-red-800 px-3 py-2 text-xs text-red-400">
              {step.errorMessage}
            </div>
          )}

          {/* 数据折叠区 */}
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setShowInput((p) => !p)}
              className="text-xs text-zinc-500 hover:text-zinc-300 underline underline-offset-2"
            >
              {showInput ? '收起' : '查看'} 输入交接包
            </button>
            {step.outputHandoff && (
              <button
                onClick={() => setShowOutput((p) => !p)}
                className="text-xs text-zinc-500 hover:text-zinc-300 underline underline-offset-2"
              >
                {showOutput ? '收起' : '查看'} 输出交接包
              </button>
            )}
            {step.rawAiResponse && (
              <button
                onClick={() => setShowRaw((p) => !p)}
                className="text-xs text-zinc-500 hover:text-zinc-300 underline underline-offset-2"
              >
                {showRaw ? '收起' : '查看'} AI 原始响应
              </button>
            )}
          </div>

          {showInput && (
            <HandoffViewer
              handoff={step.inputHandoff}
              title="输入交接包"
              editable={needsApproval && step.status !== 'success'}
              onSave={(updated) => setEditedHandoff(updated)}
            />
          )}
          {showOutput && step.outputHandoff && (
            <HandoffViewer handoff={step.outputHandoff} title="输出交接包" />
          )}
          {showRaw && step.rawAiResponse && (
            <div className="rounded-lg border border-zinc-800 bg-zinc-950 overflow-hidden">
              <div className="border-b border-zinc-800 px-3 py-2">
                <span className="text-xs text-zinc-500">AI 原始响应</span>
              </div>
              <pre className="overflow-auto p-3 text-xs text-zinc-400 max-h-60 font-mono whitespace-pre-wrap">
                {step.rawAiResponse}
              </pre>
            </div>
          )}
        </div>
      )}

      {/* 等待审批操作区 */}
      {needsApproval && step.status === 'success' && (
        <div className="border-t border-indigo-500/30 bg-indigo-900/10 px-4 py-3">
          <p className="text-xs text-indigo-400 mb-3">
            审查输出交接包后，确认继续执行下一步
            {editedHandoff && ' （已编辑交接包）'}
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => onApprove(editedHandoff || undefined)}
              className="flex-1 rounded-md bg-indigo-600 py-2 text-sm font-medium text-white hover:bg-indigo-500 transition-colors"
            >
              确认继续
            </button>
            <button
              onClick={onSkip}
              className="rounded-md border border-zinc-700 px-4 py-2 text-sm text-zinc-400 hover:text-zinc-200 transition-colors"
            >
              跳过
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
