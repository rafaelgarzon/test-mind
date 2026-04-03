'use client';

import { useCallback, useRef, useState } from 'react';
import { getPipelineUrl } from '@/lib/api';
import type {
  AgentEvent,
  AgentName,
  AgentState,
  AgentStatus,
  AGENT_ORDER,
  PipelineState,
  PreviewResult,
} from '@/lib/types';

const AGENTS: readonly string[] = [
  'DuplicatePreventionAgent',
  'RequirementsAgent',
  'BusinessAlignmentAgent',
  'CodeGeneratorAgent',
  'ValidationAgent',
  'ReportingAgent',
  'ReviewImplementerAgent',
];

function initialAgents(): AgentState[] {
  return AGENTS.map(name => ({ name, status: 'pending' as AgentStatus, lastMessage: '' }));
}

const INITIAL_STATE: PipelineState = {
  agents: initialAgents(),
  isRunning: false,
  isDone: false,
  isDuplicate: false,
  gherkin: '',
  featureName: '',
  tsCode: '',
  previewResult: null,
  error: null,
};

// Detecta el nombre canónico del agente desde el campo "agent" del evento SSE
function resolveAgent(raw: string): string {
  const normalized = raw.toLowerCase();
  return AGENTS.find(a => normalized.includes(a.toLowerCase())) ?? raw;
}

export function useSSEPipeline() {
  const [state, setState] = useState<PipelineState>(INITIAL_STATE);
  const abortRef = useRef<AbortController | null>(null);

  const run = useCallback(async (userRequirement: string) => {
    // Cancela cualquier stream previo
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setState({ ...INITIAL_STATE, isRunning: true, agents: initialAgents() });

    try {
      const res = await fetch(getPipelineUrl(), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userRequirement }),
        signal: controller.signal,
      });

      if (!res.ok || !res.body) {
        throw new Error(`Error HTTP ${res.status}`);
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';

        for (const line of lines) {
          if (!line.startsWith('data:')) continue;
          const jsonStr = line.slice(5).trim();
          if (!jsonStr) continue;

          try {
            const event: AgentEvent = JSON.parse(jsonStr);
            processEvent(event);
          } catch {
            // línea malformada — ignorar
          }
        }
      }
    } catch (err: unknown) {
      if ((err as Error).name === 'AbortError') return;
      setState(prev => ({
        ...prev,
        isRunning: false,
        isDone: true,
        error: err instanceof Error ? err.message : 'Error desconocido',
      }));
    }

    function processEvent(event: AgentEvent) {
      setState(prev => {
        const agents = prev.agents.map(a => ({ ...a }));
        const agentName = resolveAgent(event.agent ?? '');
        const idx = agents.findIndex(a => a.name === agentName);

        if (idx !== -1) {
          agents[idx] = {
            ...agents[idx],
            status: event.finished
              ? event.error ? 'error' : 'done'
              : 'running',
            lastMessage: event.status ?? '',
          };
        }

        // Extraer datos del resultado final
        let gherkin = prev.gherkin;
        let featureName = prev.featureName;
        let tsCode = prev.tsCode;
        let previewResult = prev.previewResult;
        let isDuplicate = prev.isDuplicate;

        if (event.result) {
          const r = event.result as Record<string, unknown>;
          if (r['gherkin']) gherkin = r['gherkin'] as string;
          if (r['featureName']) featureName = r['featureName'] as string;
          if (r['tsCode']) tsCode = r['tsCode'] as string;
          if (r['executionData']) previewResult = r['executionData'] as PreviewResult;
          if (r['isDuplicate']) isDuplicate = true;
        }
        if (event.isDuplicate) isDuplicate = true;

        const isBackendDone = event.agent === 'Backend' && event.finished === true;
        const allDone = isBackendDone || agents.every(a => a.status !== 'running' && a.status !== 'pending');

        return {
          ...prev,
          agents,
          gherkin,
          featureName,
          tsCode,
          previewResult,
          isDuplicate,
          isRunning: !allDone,
          isDone: allDone,
          error: event.error ?? prev.error,
        };
      });
    }
  }, []);

  const cancel = useCallback(() => {
    abortRef.current?.abort();
    setState(prev => ({ ...prev, isRunning: false }));
  }, []);

  const reset = useCallback(() => {
    abortRef.current?.abort();
    setState(INITIAL_STATE);
  }, []);

  return { state, run, cancel, reset };
}
