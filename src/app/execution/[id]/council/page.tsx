'use client';

import { useEffect, useState, use } from 'react';
import { useRouter } from 'next/navigation';
import CouncilPanel from '@/components/council/CouncilPanel';

export default function CouncilPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [userInput, setUserInput] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch(`/api/execution/${id}`);
        const data = await res.json();
        setUserInput(data.execution?.userInput || '');
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id]);

  const handleApprove = () => {
    router.push(`/execution/${id}`);
  };

  const handleReject = () => {
    router.push('/');
  };

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <svg className="animate-spin h-6 w-6 text-amber-400" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      </div>
    );
  }

  return (
    <div className="flex flex-1 items-center justify-center px-4 py-12">
      <div className="w-full max-w-2xl">
        <div className="mb-6">
          <button
            onClick={() => router.push(`/execution/${id}`)}
            className="flex items-center gap-1.5 text-sm text-zinc-500 hover:text-zinc-300 transition-colors"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            返回执行控制台
          </button>
        </div>
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-8">
          <CouncilPanel
            executionId={id}
            userInput={userInput}
            onApprove={handleApprove}
            onReject={handleReject}
          />
        </div>
      </div>
    </div>
  );
}
