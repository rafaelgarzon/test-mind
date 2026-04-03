'use client';

import { useCallback, useEffect, useState } from 'react';
import { useSSEPipeline } from '@/hooks/useSSEPipeline';
import { useImplement } from '@/hooks/useImplement';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Spinner } from '@/components/ui/Spinner';
import { Toast } from '@/components/ui/Toast';
import { AgentTimeline } from '@/components/pipeline/AgentTimeline';
import { GherkinViewer } from '@/components/gherkin/GherkinViewer';
import { TypeScriptViewer } from '@/components/gherkin/TypeScriptViewer';
import { PreviewCarousel } from '@/components/preview/PreviewCarousel';

// ─── Sección con título ────────────────────────────────────────────────────────
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-4">
      <h2 className="text-xs font-semibold uppercase tracking-widest text-zinc-500 border-b border-zinc-800 pb-2">
        {title}
      </h2>
      {children}
    </section>
  );
}

// ─── Dashboard ────────────────────────────────────────────────────────────────
export default function Dashboard() {
  const [requirement, setRequirement] = useState('');
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const { state, run, cancel, reset } = useSSEPipeline();
  const impl = useImplement();

  const showToast = useCallback((message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
  }, []);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    const req = requirement.trim();
    if (!req) return;
    impl.reset();
    await run(req);
  }, [requirement, run, impl]);

  const handleImplement = useCallback(async () => {
    if (!state.gherkin || !state.tsCode) return;
    const name = state.featureName || 'generated-scenario';
    await impl.run(state.gherkin, state.tsCode, name);
  }, [state, impl]);

  // Toast reactivo: se dispara cuando impl.success/error cambia tras el re-render
  useEffect(() => {
    if (impl.success && impl.featurePath) {
      showToast(`✅ Archivos guardados:\n${impl.featurePath}\n${impl.stepsPath ?? ''}`);
    }
  }, [impl.success]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (impl.error) {
      showToast(impl.error, 'error');
    }
  }, [impl.error]); // eslint-disable-line react-hooks/exhaustive-deps

  const pipelineStarted = state.isRunning || state.isDone;
  const hasGherkin      = state.gherkin.length > 0;
  const hasCode         = state.tsCode.length > 0;
  const hasPreview      = state.previewResult !== null;
  const canImplement    = hasGherkin && hasCode && !impl.isLoading && !impl.success;

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 font-sans">

      {/* ── Header ── */}
      <header className="sticky top-0 z-30 border-b border-zinc-800 bg-zinc-950/90 backdrop-blur-sm">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-3">
          <div className="flex items-center gap-3">
            <span className="text-xl">🤖</span>
            <div>
              <h1 className="text-sm font-bold text-zinc-100 leading-tight">Automation Front AI</h1>
              <p className="text-xs text-zinc-500">Pipeline de 7 agentes · Playwright MCP</p>
            </div>
          </div>
          <StatusBadge />
        </div>
      </header>

      {/* ── Main ── */}
      <main className="mx-auto max-w-5xl space-y-10 px-6 py-10">

        {/* ── Formulario ── */}
        <section className="space-y-4">
          <form onSubmit={handleSubmit} className="space-y-3">
            <label className="block text-sm font-medium text-zinc-300">
              Requerimiento de prueba
            </label>
            <textarea
              value={requirement}
              onChange={e => setRequirement(e.target.value)}
              placeholder="Ej: El usuario debería poder iniciar sesión con credenciales válidas y ver su dashboard..."
              rows={4}
              disabled={state.isRunning}
              className="w-full resize-none rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-3 text-sm text-zinc-200 placeholder:text-zinc-600 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 disabled:opacity-50 transition-colors"
            />
            <div className="flex items-center gap-3">
              {!state.isRunning ? (
                <button
                  type="submit"
                  disabled={!requirement.trim()}
                  className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  🚀 Generar con Pipeline
                </button>
              ) : (
                <button
                  type="button"
                  onClick={cancel}
                  className="inline-flex items-center gap-2 rounded-xl border border-red-700 px-6 py-2.5 text-sm font-semibold text-red-400 hover:bg-red-900/20 transition-colors"
                >
                  ✕ Cancelar
                </button>
              )}
              {(state.isDone || state.error) && (
                <button
                  type="button"
                  onClick={() => { reset(); setRequirement(''); impl.reset(); }}
                  className="text-sm text-zinc-500 hover:text-zinc-300 transition-colors"
                >
                  ↺ Nueva generación
                </button>
              )}
              {state.isRunning && (
                <div className="flex items-center gap-2 text-sm text-zinc-500">
                  <Spinner size="sm" />
                  Procesando pipeline…
                </div>
              )}
            </div>
          </form>
        </section>

        {/* ── Pipeline timeline ── */}
        {pipelineStarted && (
          <Section title="Pipeline de Agentes">
            <AgentTimeline
              agents={state.agents}
              isDuplicate={state.isDuplicate}
              error={state.error}
            />
          </Section>
        )}

        {/* ── Gherkin generado ── */}
        {hasGherkin && (
          <Section title="Gherkin Generado">
            <GherkinViewer gherkin={state.gherkin} />
          </Section>
        )}

        {/* ── Código TypeScript ── */}
        {hasCode && (
          <Section title="Código TypeScript — Step Definitions (Screenplay)">
            <TypeScriptViewer code={state.tsCode} />
          </Section>
        )}

        {/* ── Preview en navegador ── */}
        {hasPreview && (
          <Section title="Preview en Navegador (Playwright MCP)">
            <PreviewCarousel result={state.previewResult!} />
          </Section>
        )}

        {/* ── Botón implementar ── */}
        {hasGherkin && hasCode && state.isDone && !state.error && (
          <section className="rounded-xl border border-zinc-700 bg-zinc-900/50 px-6 py-5">
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div>
                <p className="text-sm font-semibold text-zinc-200">Implementar en el proyecto</p>
                <p className="text-xs text-zinc-500 mt-1">
                  Escribe <code className="font-mono text-zinc-400">.feature</code> y{' '}
                  <code className="font-mono text-zinc-400">.steps.ts</code> en{' '}
                  <code className="font-mono text-zinc-400">features/</code>
                </p>
              </div>
              <div className="flex items-center gap-3">
                {impl.success && (
                  <span className="text-xs text-emerald-400">✅ Implementado</span>
                )}
                {impl.error && (
                  <span className="text-xs text-red-400">❌ {impl.error}</span>
                )}
                <button
                  onClick={handleImplement}
                  disabled={!canImplement || impl.isLoading}
                  className="inline-flex items-center gap-2 rounded-xl bg-emerald-700 px-6 py-2.5 text-sm font-semibold text-white hover:bg-emerald-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  {impl.isLoading ? <><Spinner size="sm" /> Guardando…</> : '💾 Implementar archivos'}
                </button>
              </div>
            </div>
            {impl.success && impl.featurePath && (
              <div className="mt-4 space-y-1 rounded-lg bg-zinc-800 px-4 py-3 font-mono text-xs text-zinc-400">
                <p>📄 {impl.featurePath}</p>
                <p>📄 {impl.stepsPath}</p>
              </div>
            )}
          </section>
        )}
      </main>

      {/* ── Toast ── */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  );
}
