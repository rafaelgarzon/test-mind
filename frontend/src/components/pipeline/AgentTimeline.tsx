import type { AgentState } from '@/lib/types';
import { AgentStep } from './AgentStep';

interface Props {
  agents: AgentState[];
  isDuplicate: boolean;
  error: string | null;
}

export function AgentTimeline({ agents, isDuplicate, error }: Props) {
  const done    = agents.filter(a => a.status === 'done').length;
  const total   = agents.length;
  const pct     = Math.round((done / total) * 100);

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-widest text-zinc-500">
          Pipeline de Agentes
        </h2>
        <span className="text-xs text-zinc-500">{done}/{total} completados</span>
      </div>

      {/* Barra de progreso */}
      <div className="h-1.5 w-full rounded-full bg-zinc-800">
        <div
          className="h-full rounded-full bg-indigo-500 transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>

      {/* Lista de agentes */}
      <div className="space-y-2">
        {agents.map((agent, i) => (
          <AgentStep key={agent.name} agent={agent} index={i} />
        ))}
      </div>

      {/* Aviso de duplicado */}
      {isDuplicate && (
        <div className="rounded-xl border border-amber-700/50 bg-amber-900/20 px-4 py-3 text-sm text-amber-300">
          ⚡ Escenario duplicado detectado en caché. Se retornó el Gherkin almacenado para ahorrar tokens.
        </div>
      )}

      {/* Error global */}
      {error && (
        <div className="rounded-xl border border-red-700/50 bg-red-900/20 px-4 py-3 text-sm text-red-300">
          💥 {error}
        </div>
      )}
    </section>
  );
}
