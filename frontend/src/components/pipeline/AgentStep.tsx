import type { AgentState, AgentStatus } from '@/lib/types';
import { Spinner } from '@/components/ui/Spinner';

const AGENT_ICONS: Record<string, string> = {
  DuplicatePreventionAgent: '🔍',
  RequirementsAgent:        '📋',
  BusinessAlignmentAgent:   '🏢',
  CodeGeneratorAgent:       '⚙️',
  ValidationAgent:          '🌐',
  ReportingAgent:           '📊',
  ReviewImplementerAgent:   '💾',
};

const AGENT_LABELS: Record<string, string> = {
  DuplicatePreventionAgent: 'Duplicate Prevention',
  RequirementsAgent:        'Requirements',
  BusinessAlignmentAgent:   'Business Alignment',
  CodeGeneratorAgent:       'Code Generator',
  ValidationAgent:          'Validation',
  ReportingAgent:           'Reporting',
  ReviewImplementerAgent:   'Review & Implement',
};

interface Props { agent: AgentState; index: number; }

export function AgentStep({ agent, index }: Props) {
  const icon  = AGENT_ICONS[agent.name]  ?? '🤖';
  const label = AGENT_LABELS[agent.name] ?? agent.name;

  const statusConfig: Record<AgentStatus, { ring: string; dot: string; text: string }> = {
    pending: { ring: 'ring-zinc-700',    dot: 'bg-zinc-600',    text: 'text-zinc-500' },
    running: { ring: 'ring-indigo-500',  dot: 'bg-indigo-400',  text: 'text-indigo-300' },
    done:    { ring: 'ring-emerald-600', dot: 'bg-emerald-400', text: 'text-emerald-300' },
    error:   { ring: 'ring-red-600',     dot: 'bg-red-400',     text: 'text-red-300' },
    skipped: { ring: 'ring-zinc-600',    dot: 'bg-zinc-500',    text: 'text-zinc-400' },
  };

  const cfg = statusConfig[agent.status];

  return (
    <div className={`flex items-start gap-4 rounded-xl border px-4 py-3 transition-all duration-300 ring-1 ${cfg.ring} ${
      agent.status === 'running' ? 'bg-indigo-950/30' :
      agent.status === 'done'   ? 'bg-emerald-950/20' :
      agent.status === 'error'  ? 'bg-red-950/20'     : 'bg-zinc-900/30'
    }`}>
      {/* Número */}
      <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-zinc-800 text-xs font-bold text-zinc-400">
        {index + 1}
      </span>

      {/* Icono del agente */}
      <span className="mt-0.5 text-lg leading-none">{icon}</span>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-zinc-200">{label}</span>
          {agent.status === 'running' && <Spinner size="sm" />}
          {agent.status === 'done'    && <span className="text-xs text-emerald-400">✓</span>}
          {agent.status === 'error'   && <span className="text-xs text-red-400">✗</span>}
        </div>
        {agent.lastMessage && (
          <p className={`mt-0.5 text-xs leading-relaxed truncate ${cfg.text}`}>
            {agent.lastMessage}
          </p>
        )}
      </div>

      {/* Indicador lateral */}
      <span className={`mt-2 h-2 w-2 shrink-0 rounded-full ${cfg.dot}`} />
    </div>
  );
}
