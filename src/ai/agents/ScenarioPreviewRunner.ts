/**
 * src/ai/agents/ScenarioPreviewRunner.ts — Fase 7 (compartido)
 *
 * Motor de ejecución de preview de escenarios Gherkin.
 * Transport-agnostic: recibe un PlaywrightToolExecutor que puede ser
 * implementado con @playwright/mcp (Fase 7.1) o cualquier otro transport.
 *
 * Estrategia de traducción de pasos:
 *  1. Heurístico síncrono (siempre disponible, instantáneo)
 *  2. LLM como mejora opcional con timeout corto (15s) — si falla, usa heurístico
 */
import { AIProvider } from '../infrastructure/AIProvider';
import { GherkinStepParser } from '../core/GherkinStepParser';
import {
    buildGherkinToPlaywrightPrompt,
    parseTranslationResponse,
    heuristicTranslate,
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

/** Timeout máximo para la EJECUCIÓN completa en el navegador (sin traducción) */
const EXECUTION_TIMEOUT_MS = 120_000;

/** Timeout corto para la mejora vía LLM — si supera esto, usamos heurístico */
const LLM_TRANSLATE_TIMEOUT_MS = 12_000;

export class ScenarioPreviewRunner {
    constructor(
        private readonly ai: AIProvider | null,
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

        // Traducir pasos: heurístico primero (síncrono), LLM como mejora opcional
        const actions = await this.translateSteps(parsedSteps);

        const results: StepPreviewResult[] = [];
        let failed = false;

        // Ejecución en navegador con timeout global
        const executionPromise = this.executeSteps(parsedSteps, actions, results);
        await Promise.race([
            executionPromise.then(didFail => { failed = didFail; }),
            new Promise<void>((_, reject) =>
                setTimeout(() => reject(new Error('Timeout en ejecución del navegador')), EXECUTION_TIMEOUT_MS)
            ),
        ]);

        return {
            steps: results,
            passed: !failed,
            totalDurationMs: Date.now() - overallStart,
            browserUsed: this.browserLabel,
        };
    }

    /** Ejecuta los pasos en el navegador y llena `results`. Retorna `true` si hubo fallo. */
    private async executeSteps(
        parsedSteps: ReturnType<typeof GherkinStepParser.parse>,
        actions: TranslatedPlaywrightAction[],
        results: StepPreviewResult[],
    ): Promise<boolean> {
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

                // Intentar screenshot del estado de fallo
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

        return failed;
    }

    /**
     * Traduce pasos Gherkin → acciones Playwright.
     *
     * Estrategia:
     * 1. Calcula heurístico instantáneamente (siempre disponible como fallback)
     * 2. Si hay IA disponible, intenta mejorar con LLM con timeout corto (12s)
     * 3. Si LLM falla o timeout → retorna el heurístico
     */
    private async translateSteps(
        steps: ReturnType<typeof GherkinStepParser.parse>
    ): Promise<TranslatedPlaywrightAction[]> {
        // Heurístico: síncrono, instantáneo, siempre disponible
        const heuristicResult = steps.map(heuristicTranslate);

        if (!this.ai) {
            console.log('[PreviewRunner] Sin IA configurada, usando traducción heurística');
            return heuristicResult;
        }

        // Intentar mejora con LLM con timeout corto
        try {
            const { system, user } = buildGherkinToPlaywrightPrompt(steps);

            const llmResult = await Promise.race<TranslatedPlaywrightAction[]>([
                this.ai.generate(system, user).then(raw => parseTranslationResponse(raw, steps)),
                new Promise<never>((_, reject) =>
                    setTimeout(() => reject(new Error('LLM timeout')), LLM_TRANSLATE_TIMEOUT_MS)
                ),
            ]);

            console.log('[PreviewRunner] Traducción LLM exitosa');
            return llmResult;

        } catch (err: any) {
            console.log(`[PreviewRunner] LLM no disponible (${err.message}) — usando heurístico`);
            return heuristicResult;
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
}
