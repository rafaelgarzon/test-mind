'use client';

import { useState } from 'react';
import type { PreviewResult } from '@/lib/types';
import { PreviewStep } from './PreviewStep';

interface Props { result: PreviewResult; }

export function PreviewCarousel({ result }: Props) {
  const [current, setCurrent] = useState(0);
  const { steps, passed, totalDurationMs, browserUsed } = result;
  const step = steps[current];

  const statusIcon = (s: string) =>
    s === 'passed' ? '✅' : s === 'failed' ? '❌' : '⏭️';

  return (
    <div className="space-y-4">
      {/* Resumen */}
      <div className="flex flex-wrap items-center gap-4 text-xs text-zinc-500">
        <span className={`font-semibold ${passed ? 'text-emerald-400' : 'text-red-400'}`}>
          {passed ? '✅ PASSED' : '❌ FAILED'}
        </span>
        <span>🌐 {browserUsed}</span>
        <span>⏱ {(totalDurationMs / 1000).toFixed(2)}s total</span>
        <span>{steps.filter(s => s.status === 'passed').length}/{steps.length} pasos OK</span>
      </div>

      {/* Tabs de pasos */}
      <div className="flex gap-1.5 overflow-x-auto pb-1">
        {steps.map((s, i) => (
          <button
            key={i}
            onClick={() => setCurrent(i)}
            className={`shrink-0 rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
              i === current
                ? 'bg-indigo-600 text-white'
                : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
            }`}
          >
            {statusIcon(s.status)} Paso {i + 1}
          </button>
        ))}
      </div>

      {/* Paso actual */}
      <div className="rounded-xl border border-zinc-700 bg-zinc-900/50 p-5">
        <PreviewStep step={step} />
      </div>

      {/* Navegación */}
      <div className="flex items-center justify-between">
        <button
          disabled={current === 0}
          onClick={() => setCurrent(c => c - 1)}
          className="rounded-lg border border-zinc-700 px-4 py-2 text-sm text-zinc-400 hover:text-zinc-200 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          ← Anterior
        </button>
        <span className="text-xs text-zinc-600">
          {current + 1} / {steps.length}
        </span>
        <button
          disabled={current === steps.length - 1}
          onClick={() => setCurrent(c => c + 1)}
          className="rounded-lg border border-zinc-700 px-4 py-2 text-sm text-zinc-400 hover:text-zinc-200 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          Siguiente →
        </button>
      </div>
    </div>
  );
}
