'use client';

import { useCallback, useState } from 'react';
import { previewScenario } from '@/lib/api';
import type { PreviewResult } from '@/lib/types';

interface PreviewState {
  result: PreviewResult | null;
  isLoading: boolean;
  error: string | null;
}

export function usePreview() {
  const [state, setState] = useState<PreviewState>({
    result: null,
    isLoading: false,
    error: null,
  });

  const run = useCallback(async (gherkin: string, steps?: string) => {
    setState({ result: null, isLoading: true, error: null });
    try {
      const res = await previewScenario(gherkin, steps);
      if (res.success && res.preview) {
        setState({ result: res.preview, isLoading: false, error: null });
      } else {
        setState({ result: null, isLoading: false, error: res.error ?? 'Error en preview' });
      }
    } catch (err: unknown) {
      setState({ result: null, isLoading: false, error: err instanceof Error ? err.message : 'Error desconocido' });
    }
  }, []);

  const reset = useCallback(() => {
    setState({ result: null, isLoading: false, error: null });
  }, []);

  return { ...state, run, reset };
}
