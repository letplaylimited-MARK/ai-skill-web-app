'use client';

import { useState } from 'react';

interface HandoffViewerProps {
  handoff: Record<string, unknown> | null;
  title?: string;
  editable?: boolean;
  onSave?: (updated: Record<string, unknown>) => void;
}

export default function HandoffViewer({ handoff, title = '交接包', editable = false, onSave }: HandoffViewerProps) {
  const [editMode, setEditMode] = useState(false);
  const [editText, setEditText] = useState('');
  const [parseError, setParseError] = useState<string | null>(null);

  const jsonString = handoff ? JSON.stringify(handoff, null, 2) : 'null';

  const startEdit = () => {
    setEditText(jsonString);
    setParseError(null);
    setEditMode(true);
  };

  const handleSave = () => {
    try {
      const parsed = JSON.parse(editText);
      onSave?.(parsed);
      setEditMode(false);
      setParseError(null);
    } catch {
      setParseError('JSON 格式错误，请检查语法');
    }
  };

  if (!handoff) {
    return (
      <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 px-4 py-8 text-center">
        <p className="text-sm text-zinc-600">暂无交接包数据</p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 overflow-hidden">
      <div className="flex items-center justify-between border-b border-zinc-800 px-3 py-2">
        <span className="text-xs font-medium text-zinc-400">{title}</span>
        <div className="flex items-center gap-2">
          {!editMode && editable && (
            <button
              onClick={startEdit}
              className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors"
            >
              编辑
            </button>
          )}
          {editMode && (
            <>
              <button
                onClick={handleSave}
                className="text-xs text-green-400 hover:text-green-300 transition-colors"
              >
                保存
              </button>
              <button
                onClick={() => { setEditMode(false); setParseError(null); }}
                className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
              >
                取消
              </button>
            </>
          )}
        </div>
      </div>

      {editMode ? (
        <div>
          <textarea
            value={editText}
            onChange={(e) => setEditText(e.target.value)}
            className="w-full bg-zinc-950 p-3 text-xs font-mono text-zinc-300 focus:outline-none min-h-[200px] resize-y"
            spellCheck={false}
          />
          {parseError && (
            <div className="border-t border-red-900 bg-red-900/20 px-3 py-2 text-xs text-red-400">
              {parseError}
            </div>
          )}
        </div>
      ) : (
        <pre className="overflow-auto p-3 text-xs leading-relaxed text-zinc-300 max-h-80 font-mono">
          {jsonString}
        </pre>
      )}
    </div>
  );
}
