/**
 * src/ai/agents/PreviewAgent.ts — Fase 7.1
 *
 * Orquestador del preview: instancia PlaywrightMcpClient + ScenarioPreviewRunner
 * y retorna el resultado completo con screenshots por paso.
 *
 * La traducción de pasos usa heurístico por defecto (instantáneo).
 * El LLM se intenta opcionalmente con timeout corto (12s) y se omite si Ollama
 * está ocupado, evitando que el preview quede bloqueado por inferencia lenta.
 */
import { PlaywrightMcpClient, PlaywrightMcpOptions } from '../../mcp/playwright-client';
import { ScenarioPreviewRunner, PreviewResult } from './ScenarioPreviewRunner';
import { OllamaProvider } from '../OllamaProvider';
import { config } from '../../config';

/** Timeout para conectar al proceso playwright-mcp */
const CONNECT_TIMEOUT_MS = 30_000;

export class PreviewAgent {
    private readonly options: PlaywrightMcpOptions;

    constructor(options?: PlaywrightMcpOptions) {
        this.options = {
            browser: (config.PREVIEW_BROWSER as PlaywrightMcpOptions['browser']) ?? 'chromium',
            headless: config.PREVIEW_HEADLESS ?? true,
            ...options,
        };
    }

    async preview(gherkin: string): Promise<PreviewResult> {
        let executor: PlaywrightMcpClient | null = null;

        try {
            // Conectar al MCP de Playwright con timeout para evitar hang indefinido
            executor = await Promise.race<PlaywrightMcpClient>([
                PlaywrightMcpClient.create(this.options),
                new Promise<never>((_, reject) =>
                    setTimeout(
                        () => reject(new Error('Timeout al conectar con playwright-mcp. Verifica que @playwright/mcp esté instalado.')),
                        CONNECT_TIMEOUT_MS
                    )
                ),
            ]);

            // Pasar OllamaProvider como AI opcional para mejorar la traducción.
            // Si Ollama tarda > 12s, el runner cae automáticamente al heurístico.
            const ai = new OllamaProvider();
            const runner = new ScenarioPreviewRunner(ai, executor, this.options.browser ?? 'chromium');

            return await runner.run(gherkin);
        } finally {
            if (executor) {
                await executor.close().catch(e =>
                    console.warn('[PreviewAgent] Error cerrando executor:', e.message)
                );
            }
        }
    }
}
