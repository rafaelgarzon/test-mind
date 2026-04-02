import type {
  StatusResponse,
  PreviewResponse,
  ImplementResponse,
} from './types';

// Backends
export const UI_API   = process.env.NEXT_PUBLIC_UI_API_URL   ?? 'http://localhost:3000';
export const PIPE_API = process.env.NEXT_PUBLIC_PIPE_API_URL ?? 'http://localhost:4000';

// ─── Status ──────────────────────────────────────────────────────────────────

export async function checkStatus(): Promise<StatusResponse> {
  try {
    const res = await fetch(`${UI_API}/api/status`, { cache: 'no-store' });
    return res.ok ? res.json() : { status: 'error' };
  } catch {
    return { status: 'offline' };
  }
}

// ─── Preview ─────────────────────────────────────────────────────────────────

export async function previewScenario(
  gherkin: string,
  steps?: string
): Promise<PreviewResponse> {
  const res = await fetch(`${UI_API}/api/preview`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ gherkin, steps }),
  });
  return res.json();
}

// ─── Implement ───────────────────────────────────────────────────────────────

export async function implementScenario(
  gherkin: string,
  steps: string,
  featureName: string
): Promise<ImplementResponse> {
  const res = await fetch(`${UI_API}/api/implement`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ gherkin, steps, featureName }),
  });
  return res.json();
}

// ─── SSE Pipeline URL ─────────────────────────────────────────────────────────

export function getPipelineUrl(): string {
  return `${PIPE_API}/api/v1/generate-scenario`;
}
