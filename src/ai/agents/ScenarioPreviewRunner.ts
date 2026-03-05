/**
 * src/ai/agents/ScenarioPreviewRunner.ts — Fase 7 (compartido)
 *
 * Motor de ejecución de preview de escenarios Gherkin.
 * Transport-agnostic: recibe un PlaywrightToolExecutor que puede ser
 * implementado con @playwright/mcp (Fase 7.1) o cualquier otro transport.
 */
import { AIProvider } from '../infrastructure/AIProvider';
import { GherkinStepParser } from '../core/GherkinStepParser';
import {
    buildGherkinToPlaywrightPrompt,
    parseTranslationResponse,
    TranslatedPlaywrightAction,
} from '../prompts/GherkinToPlaywrightPrompt';

export interface McpToolContent {
    type: string;
    text?: string;
    data?: string;        // base64 para imágenes
    mimeType?: string;
}

export interface McpToolResult {
    content: McpToolContent[];
    isError?: boolean;
}

/**
 * Interfaz de transport para herramientas Playwright.
 * Implementada por PlaywrightMcpClient (7.1) u otros providers.
 */
export interface PlaywrightToolExecutor {
    execute(toolName: string, args: Record<string, unknown>): Promise<McpToolResult>;
    close(): Promise<void>;
}

export interface StepPreviewResult {
    index: number;
    stepText: string;
    keyword: string;
    status: 'passed' | 'failed' | 'skipped';
    screenshotBase64: string | null;
    error?: string;
    durationMs: number;
}

export interface PreviewResult {
    steps: StepPreviewResult[];
    passed: boolean;
    totalDurationMs: number;
    browserUsed: string;
}

const PREVIEW_TIMEOUT_MS = 120_000;

export class ScenarioPreviewRunner {
    constructor(
        private readonly ai: AIProvider,
        private readonly executor: PlaywrightToolExecutor,
        private readonly browserLabel: string = 'chromium',
    ) {}

    async run(gherkin: string): Promise<PreviewResult> {
        const overallStart = Date.now();
        const parsedSteps = GherkinStepParser.parse(gherkin);

        if (parsedSteps.length === 0) {
            return {
                steps: [],
                passed: false,
                totalDurationMs: 0,
                browserUsed: this.browserLabel,
            };
        }

        // Traducir Gherkin → acciones Playwright con timeout
        const actions = await Promise.race<TranslatedPlaywrightAction[]>([
            this.translateSteps(parsedSteps),
            this.timeout<TranslatedPlaywrightAction[]>(PREVIEW_TIMEOUT_MS, 'Timeout traduciendo pasos'),
        ]);

        const results: StepPreviewResult[] = [];
        let failed = false;

        for (let i = 0; i < parsedSteps.length; i++) {
            const step = parsedSteps[i];
            const action = actions[i] ?? {
                stepIndex: i,
                stepText: step.text,
                toolName: 'browser_snapshot',
                toolArgs: {},
            };

            if (failed) {
                results.push({
                    index: i,
                    stepText: step.text,
                    keyword: step.rawKeyword,
                    status: 'skipped',
                    screenshotBase64: null,
                    durationMs: 0,
                });
                continue;
            }

            const stepStart = Date.now();
            let screenshotBase64: string | null = null;
            let error: string | undefined;
            let status: StepPreviewResult['status'] = 'passed';

            try {
                // Ejecutar la acción del paso
                const result = await this.executor.execute(action.toolName, action.toolArgs);
                if (result.isError) {
                    throw new Error(result.content.find(c => c.type === 'text')?.text ?? 'Tool error');
                }

                // Tomar screenshot después de cada paso (inyectado automáticamente)
                const screenshotResult = await this.executor.execute('browser_take_screenshot', {});
                screenshotBase64 = this.extractScreenshot(screenshotResult);

            } catch (err: any) {
                failed = true;
                status = 'failed';
                error = err.message ?? String(err);

                // Intentar screenshot de fallo
                try {
                    const screenshotResult = await this.executor.execute('browser_take_screenshot', {});
                    screenshotBase64 = this.extractScreenshot(screenshotResult);
                } catch {
                    // screenshot de fallo también falló, no crítico
                }
            }

            results.push({
                index: i,
                stepText: step.text,
                keyword: step.rawKeyword,
                status,
                screenshotBase64,
                error,
                durationMs: Date.now() - stepStart,
            });
        }

        return {
            steps: results,
            passed: !failed,
            totalDurationMs: Date.now() - overallStart,
            browserUsed: this.browserLabel,
        };
    }

    private async translateSteps(steps: ReturnType<typeof GherkinStepParser.parse>): Promise<TranslatedPlaywrightAction[]> {
        const { system, user } = buildGherkinToPlaywrightPrompt(steps);
        try {
            const raw = await this.ai.generate(system, user);
            return parseTranslationResponse(raw, steps);
        } catch (err) {
            console.warn('[ScenarioPreviewRunner] Fallo al llamar al LLM para traducción, usando heurístico');
            const { heuristicTranslate } = await import('../prompts/GherkinToPlaywrightPrompt');
            return steps.map(heuristicTranslate);
        }
    }

    private extractScreenshot(result: McpToolResult): string | null {
        // @playwright/mcp retorna screenshots como content con type:'image' y data en base64
        const imageContent = result.content.find(c => c.type === 'image' && c.data);
        if (imageContent?.data) return imageContent.data;

        // Algunos transports lo retornan como text con data URI
        const textContent = result.content.find(c => c.type === 'text' && c.text?.startsWith('data:image'));
        if (textContent?.text) {
            return textContent.text.replace(/^data:image\/[a-z]+;base64,/, '');
        }

        return null;
    }

    private timeout<T>(ms: number, message: string): Promise<T> {
        return new Promise((_, reject) =>
            setTimeout(() => reject(new Error(message)), ms)
        );
    }
}
