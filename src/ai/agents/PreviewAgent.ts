/**
 * src/ai/agents/PreviewAgent.ts — Fase 7.1
 *
 * Orquestador del preview: instancia PlaywrightMcpClient + ScenarioPreviewRunner
 * y retorna el resultado completo con screenshots por paso.
 */
import { PlaywrightMcpClient, PlaywrightMcpOptions } from '../../mcp/playwright-client';
import { ScenarioPreviewRunner, PreviewResult } from './ScenarioPreviewRunner';
import { OllamaProvider } from '../OllamaProvider';
import { config } from '../../config';

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
            executor = await PlaywrightMcpClient.create(this.options);

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
