'use client';

import { useEffect } from 'react';

interface Props {
  message: string;
  type?: 'success' | 'error';
  onClose: () => void;
  durationMs?: number;
}

export function Toast({ message, type = 'success', onClose, durationMs = 4000 }: Props) {
  useEffect(() => {
    const id = setTimeout(onClose, durationMs);
    return () => clearTimeout(id);
  }, [onClose, durationMs]);

  const styles = {
    success: 'bg-emerald-900/80 border-emerald-700 text-emerald-200',
    error:   'bg-red-900/80    border-red-700    text-red-200',
  }[type];

  const icon = type === 'success' ? '✅' : '❌';

  return (
    <div className={`fixed bottom-6 right-6 z-50 flex items-start gap-3 rounded-xl border px-5 py-4 shadow-2xl backdrop-blur-sm transition-all ${styles}`}>
      <span className="text-lg">{icon}</span>
      <p className="text-sm font-medium leading-snug max-w-xs">{message}</p>
      <button onClick={onClose} className="ml-2 text-xs opacity-60 hover:opacity-100">✕</button>
    </div>
  );
}
