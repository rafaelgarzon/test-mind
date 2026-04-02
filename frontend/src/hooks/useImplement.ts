'use client';

import { useCallback, useState } from 'react';
import { implementScenario } from '@/lib/api';

interface ImplementState {
  featurePath: string | null;
  stepsPath: string | null;
  isLoading: boolean;
  error: string | null;
  success: boolean;
}

export function useImplement() {
  const [state, setState] = useState<ImplementState>({
    featurePath: null,
    stepsPath: null,
    isLoading: false,
    error: null,
    success: false,
  });

  const run = useCallback(async (gherkin: string, steps: string, featureName: string) => {
    setState(prev => ({ ...prev, isLoading: true, error: null, success: false }));
    try {
      const res = await implementScenario(gherkin, steps, featureName);
      if (res.success) {
        setState({
          featurePath: res.featurePath ?? null,
          stepsPath: res.stepsPath ?? null,
          isLoading: false,
          error: null,
          success: true,
        });
      } else {
        setState(prev => ({ ...prev, isLoading: false, error: res.error ?? 'Error al implementar' }));
      }
    } catch (err: unknown) {
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: err instanceof Error ? err.message : 'Error desconocido',
      }));
    }
  }, []);

  const reset = useCallback(() => {
    setState({ featurePath: null, stepsPath: null, isLoading: false, error: null, success: false });
  }, []);

  return { ...state, run, reset };
}
