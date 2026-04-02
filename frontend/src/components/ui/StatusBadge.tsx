'use client';

import { useEffect, useState } from 'react';
import { checkStatus } from '@/lib/api';

export function StatusBadge() {
  const [status, setStatus] = useState<'online' | 'offline' | 'checking'>('checking');

  useEffect(() => {
    let cancelled = false;
    async function ping() {
      const res = await checkStatus();
      if (!cancelled) setStatus(res.status === 'online' ? 'online' : 'offline');
    }
    ping();
    const id = setInterval(ping, 30_000);
    return () => { cancelled = true; clearInterval(id); };
  }, []);

  const colors = {
    online:   'bg-emerald-500/15 text-emerald-400 ring-emerald-500/30',
    offline:  'bg-red-500/15 text-red-400 ring-red-500/30',
    checking: 'bg-zinc-500/15 text-zinc-400 ring-zinc-500/30',
  };

  const labels = { online: 'Ollama online', offline: 'Ollama offline', checking: 'Verificando…' };
  const dots   = { online: 'bg-emerald-400', offline: 'bg-red-400', checking: 'bg-zinc-400 animate-pulse' };

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ring-1 ring-inset ${colors[status]}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${dots[status]}`} />
      {labels[status]}
    </span>
  );
}
