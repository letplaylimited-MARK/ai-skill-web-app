'use client';

import { ExecutionMode } from '@/lib/schema/types';

interface ModeSelectorProps {
  value: ExecutionMode;
  onChange: (mode: ExecutionMode) => void;
}

const MODES: { mode: ExecutionMode; label: string; desc: string; color: string }[] = [
  {
    mode: 'A',
    label: '全步确认',
    desc: '每步暂停等待确认，适合初次学习',
    color: 'bg-blue-600/20 border-blue-500/50 text-blue-300',
  },
  {
    mode: 'B',
    label: '关键确认',
    desc: '关键节点确认，效率与控制兼顾',
    color: 'bg-green-600/20 border-green-500/50 text-green-300',
  },
  {
    mode: 'C',
    label: '全自动',
    desc: '全自动执行，最快速完成任务',
    color: 'bg-indigo-600/20 border-indigo-500/50 text-indigo-300',
  },
  {
    mode: 'D',
    label: '路由确认',
    desc: 'S00 路由后确认，带圆桌审议',
    color: 'bg-amber-600/20 border-amber-500/50 text-amber-300',
  },
  {
    mode: 'E',
    label: '严格审议',
    desc: '每步圆桌审议，最高质量保障',
    color: 'bg-red-600/20 border-red-500/50 text-red-300',
  },
];

export default function ModeSelector({ value, onChange }: ModeSelectorProps) {
  return (
    <div className="space-y-2">
      <label className="block text-xs font-medium text-zinc-400 uppercase tracking-wider">
        执行模式
      </label>
      <div className="grid grid-cols-5 gap-2">
        {MODES.map(({ mode, label, desc, color }) => (
          <button
            key={mode}
            type="button"
            onClick={() => onChange(mode)}
            title={desc}
            className={`relative rounded-lg border p-2.5 text-center transition-all focus:outline-none ${
              value === mode
                ? `${color} ring-1 ring-offset-1 ring-offset-zinc-900`
                : 'border-zinc-700 bg-zinc-800/50 text-zinc-400 hover:border-zinc-600 hover:text-zinc-300'
            }`}
          >
            <div className="text-sm font-bold">{mode}</div>
            <div className="mt-0.5 text-xs leading-tight opacity-80 hidden sm:block">{label}</div>
          </button>
        ))}
      </div>
      <p className="text-xs text-zinc-500">
        {MODES.find((m) => m.mode === value)?.desc}
      </p>
    </div>
  );
}
