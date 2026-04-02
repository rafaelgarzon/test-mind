'use client';

import { useState } from 'react';

interface Props { code: string; }

export function TypeScriptViewer({ code }: Props) {
  const [copied, setCopied] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  const copy = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const lines = code.split('\n');

  return (
    <div className="rounded-xl border border-zinc-700 bg-zinc-900 overflow-hidden">
      <div className="flex items-center justify-between border-b border-zinc-700 px-4 py-2">
        <div className="flex items-center gap-3">
          <span className="text-xs font-medium text-zinc-400">TypeScript — Step Definitions</span>
          <span className="text-xs text-zinc-600">{lines.length} líneas</span>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setCollapsed(c => !c)}
            className="text-xs text-zinc-500 hover:text-zinc-200 transition-colors"
          >
            {collapsed ? '▼ Expandir' : '▲ Colapsar'}
          </button>
          <button
            onClick={copy}
            className="text-xs text-zinc-500 hover:text-zinc-200 transition-colors"
          >
            {copied ? '✅ Copiado' : '📋 Copiar'}
          </button>
        </div>
      </div>
      {!collapsed && (
        <pre className="overflow-x-auto p-4 text-xs leading-6 font-mono text-zinc-300 max-h-96">
          {lines.map((line, i) => (
            <div key={i} className="flex gap-4">
              <span className="select-none text-zinc-700 w-6 text-right shrink-0">{i + 1}</span>
              <span>{line}</span>
            </div>
          ))}
        </pre>
      )}
    </div>
  );
}
