'use client';

import { useEffect, useState, useCallback, useRef, use } from 'react';
import { useRouter } from 'next/navigation';
import SkillPanel from '@/components/execution/SkillPanel';
import ExecutionTrace from '@/components/execution/ExecutionTrace';

interface StepData {
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

interface ExecutionData {
  id: string;
  userInput: string;
  mode: string;
  state: string;
  currentSkill: string | null;
  councilPassed: boolean;
  apiProvider: string;
  steps: StepData[];
  councilReport?: Record<string, unknown> | null;
}

interface NextActionState {
  type: 'execute' | 'council_review' | 'needs_approval' | 'complete' | null;
  nextSkill?: string;
  currentHandoff?: Record<string, unknown>;
}

const SKILL_ORDER = [
  'skill-00-navigator',
  'skill-01-prompt-engineer',
  'skill-02-sop-engineer',
  'skill-03-scout',
  'skill-04-planner',
  'skill-05-validator',
];

function getNextSkill(steps: StepData[]): string | undefined {
  const completedSkills = new Set(
    steps.filter((s) => s.status === 'success').map((s) => s.skillCode)
  );
  return SKILL_ORDER.find((s) => !completedSkills.has(s));
}

export default function ExecutionConsolePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [execution, setExecution] = useState<ExecutionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [nextAction, setNextAction] = useState<NextActionState>({ type: null });
  // 使用 ref 追踪执行中状态，避免 closure 陷阱
  const executingRef = useRef(false);
  const [executingUI, setExecutingUI] = useState(false);

  // 加载执行状态
  const loadExecution = useCallback(async (): Promise<ExecutionData | null> => {
    try {
      const res = await fetch(`/api/execution/${id}`);
      if (!res.ok) throw new Error('加载执行记录失败');
      const data = await res.json();
      // API 返回 { execution: ... }
      const exec: ExecutionData = data.execution;
      setExecution(exec);
      return exec;
    } catch (err) {
      setError(err instanceof Error ? err.message : '未知错误');
      return null;
    }
  }, [id]);

  // 根据执行状态确定下一步行动
  const resolveNextAction = useCallback((exec: ExecutionData): NextActionState => {
    if (exec.state === 'completed' || exec.state === 'failed') {
      return { type: 'complete' };
    }

    const successfulSteps = exec.steps.filter((s) => s.status === 'success');
    const lastSuccessStep = successfulSteps[successfulSteps.length - 1];
    const nextSkill = getNextSkill(exec.steps);

    // 模式 D/E：需圆桌且未通过
    if ((exec.mode === 'D' || exec.mode === 'E') && !exec.councilPassed) {
      return { type: 'council_review' };
    }

    if (!nextSkill) {
      return { type: 'complete' };
    }

    // 模式 C：全自动，直接执行
    if (exec.mode === 'C') {
      return {
        type: 'execute',
        nextSkill,
        currentHandoff: lastSuccessStep?.outputHandoff as Record<string, unknown> | undefined,
      };
    }

    // 模式 A/B/E：需要用户审批才能继续
    if (lastSuccessStep) {
      return {
        type: 'needs_approval',
        nextSkill,
        currentHandoff: lastSuccessStep.outputHandoff as Record<string, unknown> | undefined,
      };
    }

    return { type: 'execute', nextSkill };
  }, []);

  // 初始化
  useEffect(() => {
    const init = async () => {
      setLoading(true);
      const exec = await loadExecution();
      setLoading(false);
      if (!exec) return;
      const action = resolveNextAction(exec);
      setNextAction(action);
    };
    init();
  }, [id, loadExecution, resolveNextAction]);

  // 执行下一个 Skill
  const executeNextSkill = useCallback(async (skillCode: string, editedHandoff?: Record<string, unknown>) => {
    if (executingRef.current) return;
    executingRef.current = true;
    setExecutingUI(true);
    setNextAction({ type: null });

    // 乐观 UI：添加 running 步骤
    setExecution((prev) => {
      if (!prev) return prev;
      const alreadyExists = prev.steps.some((s) => s.skillCode === skillCode && s.status !== 'error');
      if (alreadyExists) return prev;
      return {
        ...prev,
        currentSkill: skillCode,
        steps: [
          ...prev.steps,
          {
            id: `temp-${skillCode}`,
            stepNumber: prev.steps.length,
            skillCode,
            status: 'running' as const,
            inputHandoff: editedHandoff || {},
          },
        ],
      };
    });

    try {
      const res = await fetch(`/api/skill/execute?execution_id=${id}&skill_code=${skillCode}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editedHandoff ? { user_edited_handoff: editedHandoff } : {}),
      });

      const data = await res.json();

      // 无论成功失败都重新加载真实状态
      const exec = await loadExecution();

      if (!res.ok) {
        setError(data.error || '执行失败');
        setNextAction({ type: null });
        return;
      }

      if (!exec) return;

      if (data.is_complete) {
        setNextAction({ type: 'complete' });
      } else if (data.needs_user_approval) {
        setNextAction({
          type: 'needs_approval',
          nextSkill: data.next_skill,
          currentHandoff: data.output_handoff,
        });
      } else if (data.next_skill) {
        // 模式 C 自动继续：设置 execute action，由 useEffect 触发
        setNextAction({
          type: 'execute',
          nextSkill: data.next_skill,
          currentHandoff: data.output_handoff,
        });
      } else {
        setNextAction({ type: 'complete' });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '执行失败');
      await loadExecution();
      setNextAction({ type: null });
    } finally {
      executingRef.current = false;
      setExecutingUI(false);
    }
  }, [id, loadExecution]);

  // 当 nextAction 为 execute 时自动触发（避免 executing 闭包问题）
  useEffect(() => {
    if (nextAction.type === 'execute' && nextAction.nextSkill && !executingRef.current) {
      executeNextSkill(nextAction.nextSkill);
    }
  // nextAction.type 和 nextAction.nextSkill 变化才触发
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nextAction.type, nextAction.nextSkill]);

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <div className="text-center">
          <svg className="animate-spin h-8 w-8 text-indigo-400 mx-auto mb-3" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          <p className="text-sm text-zinc-400">加载执行状态...</p>
        </div>
      </div>
    );
  }

  if (error && !execution) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <div className="text-center">
          <p className="text-red-400 mb-4">{error}</p>
          <button onClick={() => router.push('/')} className="text-sm text-zinc-400 underline">
            返回首页
          </button>
        </div>
      </div>
    );
  }

  if (!execution) return null;

  const isComplete = nextAction.type === 'complete' || execution.state === 'completed';
  const lastSuccessStep = [...execution.steps].reverse().find((s) => s.status === 'success');

  return (
    <div className="flex flex-1 flex-col">
      {/* 顶部状态栏 */}
      <div className="border-b border-zinc-800 bg-zinc-950/80 px-4 py-3 sticky top-14 z-40 backdrop-blur-sm">
        <div className="mx-auto max-w-4xl">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-2">
                <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${
                  isComplete ? 'bg-green-900/40 text-green-400' :
                  executingUI ? 'bg-blue-900/40 text-blue-400' :
                  execution.state === 'in_progress' ? 'bg-blue-900/40 text-blue-400' :
                  'bg-zinc-800 text-zinc-400'
                }`}>
                  <span className={`h-1.5 w-1.5 rounded-full ${
                    isComplete ? 'bg-green-400' :
                    executingUI || execution.state === 'in_progress' ? 'bg-blue-400 animate-pulse' :
                    'bg-zinc-500'
                  }`} />
                  {isComplete ? '已完成' :
                   executingUI ? '执行中...' :
                   nextAction.type === 'needs_approval' ? '等待确认' :
                   nextAction.type === 'council_review' ? '需要圆桌审议' :
                   execution.state === 'in_progress' ? '执行中' : '初始化'}
                </span>
                <span className="text-xs text-zinc-500">模式 {execution.mode}</span>
                <span className="text-xs text-zinc-500">{execution.apiProvider}</span>
              </div>
              <ExecutionTrace
                steps={execution.steps}
                currentSkill={execution.currentSkill}
              />
            </div>
            <div className="flex gap-2 flex-shrink-0">
              {isComplete && (
                <button
                  onClick={() => router.push(`/execution/${id}/result`)}
                  className="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-indigo-500 transition-colors"
                >
                  查看结果
                </button>
              )}
              <button
                onClick={() => router.push('/')}
                className="rounded-lg border border-zinc-700 px-3 py-1.5 text-xs text-zinc-400 hover:text-zinc-200 transition-colors"
              >
                新建
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 主内容区 */}
      <div className="mx-auto w-full max-w-4xl px-4 py-6 space-y-4">
        {/* 用户输入 */}
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 px-5 py-4">
          <p className="text-xs text-zinc-500 mb-1">用户需求</p>
          <p className="text-sm text-zinc-200 leading-relaxed">{execution.userInput}</p>
        </div>

        {/* 圆桌审议提示 */}
        {nextAction.type === 'council_review' && (
          <div className="rounded-xl border border-amber-700/50 bg-amber-900/10 px-5 py-4 text-center">
            <p className="text-sm text-amber-300 font-medium mb-3">
              模式 {execution.mode} 需要圆桌审议，请先完成审议后再继续执行
            </p>
            <button
              onClick={() => router.push(`/execution/${id}/council`)}
              className="rounded-lg bg-amber-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-amber-500 transition-colors"
            >
              进入圆桌审议
            </button>
          </div>
        )}

        {/* 错误提示 */}
        {error && (
          <div className="rounded-lg border border-red-800 bg-red-900/20 px-4 py-3 text-sm text-red-400">
            <span className="font-medium">错误：</span>{error}
            <button onClick={() => setError(null)} className="ml-3 text-zinc-500 hover:text-zinc-300">
              忽略
            </button>
          </div>
        )}

        {/* Skill 步骤列表 */}
        <div className="space-y-3">
          {execution.steps.map((step) => {
            const isActiveStep =
              step.skillCode === execution.currentSkill ||
              (executingUI && step.status === 'running');

            const isLastSuccess = step === lastSuccessStep;
            const needsApprovalForStep =
              nextAction.type === 'needs_approval' && isLastSuccess;

            return (
              <SkillPanel
                key={step.id}
                step={step}
                isActive={!!isActiveStep}
                needsApproval={!!needsApprovalForStep}
                onApprove={(edited) => {
                  if (nextAction.nextSkill) {
                    executeNextSkill(nextAction.nextSkill, edited);
                  }
                }}
                onSkip={() => {
                  if (nextAction.nextSkill) {
                    executeNextSkill(nextAction.nextSkill);
                  }
                }}
              />
            );
          })}
        </div>

        {/* 等待确认提示（无步骤时） */}
        {nextAction.type === 'needs_approval' && execution.steps.length === 0 && (
          <div className="rounded-xl border border-indigo-700/50 bg-indigo-900/10 px-5 py-4 text-center">
            <p className="text-sm text-indigo-300 mb-3">准备好执行第一个步骤</p>
            <button
              onClick={() => nextAction.nextSkill && executeNextSkill(nextAction.nextSkill)}
              className="rounded-lg bg-indigo-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-indigo-500 transition-colors"
            >
              开始执行
            </button>
          </div>
        )}

        {/* 完成状态 */}
        {isComplete && (
          <div className="rounded-xl border border-green-700/40 bg-green-900/10 px-6 py-8 text-center">
            <div className="text-3xl mb-3">🎉</div>
            <h3 className="text-lg font-semibold text-green-400 mb-2">全流程执行完成</h3>
            <p className="text-sm text-zinc-400 mb-6">六层 AI Skill 已完成完整分析与规划，点击查看详细结果报告</p>
            <div className="flex gap-3 justify-center">
              <button
                onClick={() => router.push(`/execution/${id}/result`)}
                className="rounded-xl bg-green-700 px-8 py-3 text-sm font-semibold text-white hover:bg-green-600 transition-colors"
              >
                查看完整报告
              </button>
              <button
                onClick={() => router.push('/')}
                className="rounded-xl border border-zinc-700 px-6 py-3 text-sm text-zinc-400 hover:text-zinc-200 transition-colors"
              >
                新建任务
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
