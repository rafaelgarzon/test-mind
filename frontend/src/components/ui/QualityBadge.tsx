import type { QualityReport } from '@/lib/types';

interface Props { quality: QualityReport; }

export function QualityBadge({ quality }: Props) {
  const { score, passed, issues } = quality;

  const tier =
    score >= 70 ? 'pass' :
    score >= 50 ? 'warn' : 'fail';

  const styles = {
    pass: { badge: 'bg-emerald-500/15 text-emerald-300 ring-emerald-500/30', icon: '✅', label: 'APROBADO' },
    warn: { badge: 'bg-amber-500/15  text-amber-300  ring-amber-500/30',  icon: '⚠️', label: 'OBSERVACIONES' },
    fail: { badge: 'bg-red-500/15    text-red-300    ring-red-500/30',    icon: '❌', label: 'RECHAZADO' },
  }[tier];

  return (
    <div className="space-y-2">
      <div className={`inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-semibold ring-1 ring-inset ${styles.badge}`}>
        <span>{styles.icon}</span>
        <span>{styles.label}</span>
        <span className="opacity-70">— {score}/100</span>
      </div>

      {issues.length > 0 && (
        <ul className="mt-2 space-y-1">
          {issues.map((issue, i) => (
            <li key={i} className="flex items-start gap-2 text-xs text-zinc-400">
              <span className="mt-0.5 text-amber-500">•</span>
              {issue}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
