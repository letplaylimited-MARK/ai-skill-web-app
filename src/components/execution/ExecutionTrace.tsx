'use client';

interface TraceStep {
  skillCode: string;
  status: 'pending' | 'running' | 'success' | 'error';
}

interface ExecutionTraceProps {
  steps: TraceStep[];
  currentSkill?: string | null;
}

const SKILL_SHORT: Record<string, string> = {
  'skill-00-navigator':       'S00',
  'skill-01-prompt-engineer': 'S01',
  'skill-02-sop-engineer':    'S02',
  'skill-03-scout':           'S03',
  'skill-04-planner':         'S04',
  'skill-05-validator':       'S05',
};

const STATUS_STYLE: Record<string, string> = {
  pending: 'border-zinc-700 bg-zinc-800 text-zinc-500',
  running: 'border-blue-500 bg-blue-900/30 text-blue-400 ring-1 ring-blue-500/30',
  success: 'border-green-600 bg-green-900/20 text-green-400',
  error:   'border-red-600 bg-red-900/20 text-red-400',
};

export default function ExecutionTrace({ steps, currentSkill }: ExecutionTraceProps) {
  return (
    <div className="flex items-center gap-1 overflow-x-auto pb-1">
      {steps.map((step, i) => (
        <div key={step.skillCode + i} className="flex items-center gap-1 flex-shrink-0">
          <div
            className={`relative rounded-md border px-3 py-2 text-xs font-bold transition-all ${
              STATUS_STYLE[step.status]
            } ${step.skillCode === currentSkill ? 'scale-110' : ''}`}
          >
            {SKILL_SHORT[step.skillCode] || step.skillCode}
            {step.status === 'running' && (
              <span className="absolute -top-1 -right-1 flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500" />
              </span>
            )}
            {step.status === 'success' && (
              <span className="absolute -top-1 -right-1 flex h-2 w-2 rounded-full bg-green-500" />
            )}
          </div>
          {i < steps.length - 1 && (
            <svg className="h-3 w-3 text-zinc-600 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          )}
        </div>
      ))}
    </div>
  );
}
