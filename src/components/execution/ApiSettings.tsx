'use client';

import { useState } from 'react';
import { ApiProvider } from '@/lib/schema/types';

interface ApiSettingsProps {
  provider: ApiProvider;
  onProviderChange: (provider: ApiProvider) => void;
  apiKey: string;
  onApiKeyChange: (key: string) => void;
  modelName: string;
  onModelNameChange: (name: string) => void;
}

const MODELS: Record<ApiProvider, { value: string; label: string }[]> = {
  claude: [
    { value: 'claude-opus-4-5', label: 'Claude Opus 4.5 (最强)' },
    { value: 'claude-sonnet-4-5', label: 'Claude Sonnet 4.5 (推荐)' },
    { value: 'claude-haiku-3-5', label: 'Claude Haiku 3.5 (快速)' },
  ],
  openai: [
    { value: 'gpt-4o', label: 'GPT-4o (推荐)' },
    { value: 'gpt-4o-mini', label: 'GPT-4o-mini (快速)' },
    { value: 'o1-mini', label: 'o1-mini (推理)' },
  ],
};

export default function ApiSettings({
  provider,
  onProviderChange,
  apiKey,
  onApiKeyChange,
  modelName,
  onModelNameChange,
}: ApiSettingsProps) {
  const [showKey, setShowKey] = useState(false);
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="rounded-lg border border-zinc-700 bg-zinc-800/30">
      <button
        type="button"
        onClick={() => setExpanded((p) => !p)}
        className="flex w-full items-center justify-between px-4 py-3 text-sm text-zinc-300 hover:text-zinc-100"
      >
        <span className="flex items-center gap-2">
          <svg className="h-4 w-4 text-zinc-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          API 设置
          <span className="rounded-full bg-zinc-700 px-2 py-0.5 text-xs text-zinc-400">
            {provider === 'claude' ? 'Claude' : 'OpenAI'} · {modelName || '默认模型'}
          </span>
        </span>
        <svg
          className={`h-4 w-4 text-zinc-500 transition-transform ${expanded ? 'rotate-180' : ''}`}
          fill="none" viewBox="0 0 24 24" stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {expanded && (
        <div className="border-t border-zinc-700 px-4 py-4 space-y-4">
          {/* Provider 切换 */}
          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-zinc-400 uppercase tracking-wider">AI 提供商</label>
            <div className="flex gap-2">
              {(['claude', 'openai'] as ApiProvider[]).map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => {
                    onProviderChange(p);
                    onModelNameChange(MODELS[p][1].value);
                  }}
                  className={`flex-1 rounded-md border py-2 text-sm font-medium transition-all ${
                    provider === p
                      ? 'border-indigo-500 bg-indigo-600/20 text-indigo-300'
                      : 'border-zinc-700 bg-zinc-800 text-zinc-400 hover:border-zinc-600'
                  }`}
                >
                  {p === 'claude' ? 'Anthropic Claude' : 'OpenAI GPT'}
                </button>
              ))}
            </div>
          </div>

          {/* 模型选择 */}
          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-zinc-400 uppercase tracking-wider">模型</label>
            <select
              value={modelName}
              onChange={(e) => onModelNameChange(e.target.value)}
              className="w-full rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-200 focus:border-indigo-500 focus:outline-none"
            >
              {MODELS[provider].map((m) => (
                <option key={m.value} value={m.value}>{m.label}</option>
              ))}
            </select>
          </div>

          {/* API Key 覆盖 */}
          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-zinc-400 uppercase tracking-wider">
              API Key <span className="normal-case text-zinc-600 font-normal">（可选，留空使用服务端环境变量）</span>
            </label>
            <div className="relative">
              <input
                type={showKey ? 'text' : 'password'}
                value={apiKey}
                onChange={(e) => onApiKeyChange(e.target.value)}
                placeholder={`sk-...（使用服务端 .env 中的 ${provider === 'claude' ? 'ANTHROPIC' : 'OPENAI'}_API_KEY）`}
                className="w-full rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2 pr-10 text-sm text-zinc-200 placeholder-zinc-600 focus:border-indigo-500 focus:outline-none font-mono"
              />
              <button
                type="button"
                onClick={() => setShowKey((p) => !p)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300"
              >
                {showKey ? (
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 4.411m0 0L21 21" />
                  </svg>
                ) : (
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
