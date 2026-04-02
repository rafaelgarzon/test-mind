import type { StepPreviewResult } from '@/lib/types';
import { ScreenshotViewer } from './ScreenshotViewer';

interface Props { step: StepPreviewResult; }

export function PreviewStep({ step }: Props) {
  const statusStyles = {
    passed:  { badge: 'bg-emerald-500/20 text-emerald-300 ring-emerald-500/30', icon: '✅' },
    failed:  { badge: 'bg-red-500/20     text-red-300     ring-red-500/30',     icon: '❌' },
    skipped: { badge: 'bg-zinc-500/20    text-zinc-400    ring-zinc-500/30',    icon: '⏭️' },
  }[step.status] ?? { badge: '', icon: '⬜' };

  const kwColors: Record<string, string> = {
    Given: 'text-cyan-400', When: 'text-orange-400', Then: 'text-emerald-400',
    And: 'text-zinc-400',   But: 'text-zinc-400',
    Dado: 'text-cyan-400',  Cuando: 'text-orange-400', Entonces: 'text-emerald-400',
  };

  return (
    <div className="space-y-4">
      {/* Cabecera del paso */}
      <div className="flex flex-wrap items-center gap-3">
        <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ring-1 ring-inset ${statusStyles.badge}`}>
          {statusStyles.icon} {step.status.toUpperCase()}
        </span>
        <span className={`text-sm font-semibold ${kwColors[step.keyword] ?? 'text-zinc-400'}`}>
          {step.keyword}
        </span>
        <span className="text-sm text-zinc-200 flex-1">{step.stepText}</span>
        <span className="text-xs text-zinc-500 shrink-0">{step.durationMs}ms</span>
      </div>

      {/* Error */}
      {step.error && (
        <div className="rounded-lg border border-red-700/40 bg-red-900/20 px-4 py-3 text-xs text-red-300 font-mono">
          {step.error}
        </div>
      )}

      {/* Screenshot */}
      <ScreenshotViewer base64={step.screenshotBase64} alt={step.stepText} />
    </div>
  );
}
