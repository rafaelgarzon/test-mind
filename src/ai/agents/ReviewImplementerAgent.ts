/**
 * src/ai/agents/ReviewImplementerAgent.ts — Fase 13
 *
 * Fase 13: implementado análisis estático real con `tsc --noEmit` sobre un
 *          archivo temporal antes de escribir al proyecto; Logger abstracto.
 *          Si el análisis falla, el agente reporta las advertencias pero
 *          continúa (non-blocking) para no romper el pipeline por errores
 *          de tipos en código generado (que puede requerir dependencias).
 */
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { execSync } from 'child_process';
import { Agent, AgentRequest, AgentResponse } from './Agent';
import { implement } from './ScenarioImplementer';
import { createLogger, Logger } from '../infrastructure/Logger';

export interface ReviewImplementerRequest extends AgentRequest {
    gherkin: string;
    featureName: string;
    tsCode: string;
    report?: string;
}

export interface ReviewImplementerResponse extends AgentResponse {
    filesWritten: string[];
    /** Advertencias del análisis estático (non-blocking) */
    staticAnalysisWarnings?: string[];
}

export class ReviewImplementerAgent implements Agent<ReviewImplementerRequest, ReviewImplementerResponse> {
    readonly name = 'ReviewImplementerAgent';
    private readonly logger: Logger = createLogger(this.name);

    async run(request: ReviewImplementerRequest): Promise<ReviewImplementerResponse> {
        this.logger.info(`Integrando código al proyecto para: "${request.featureName}"`);

        try {
            // 1. Análisis estático real con tsc --noEmit sobre archivo temporal
            const warnings = this.runStaticAnalysis(request.tsCode, request.featureName);

            // 2. Escribir archivos al proyecto via ScenarioImplementer (Phase 7)
            const implResult = await implement({
                gherkin: request.gherkin,
                steps: request.tsCode,
                featureName: request.featureName,
            });

            if (!implResult.success) {
                return {
                    success: false,
                    error: `Fallo al escribir archivos: ${implResult.error}`,
                    filesWritten: [],
                };
            }

            this.logger.info('✅ Implementación finalizada en rama actual.');
            return {
                success: true,
                filesWritten: [implResult.featurePath, implResult.stepsPath],
                staticAnalysisWarnings: warnings,
            };

        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : 'Error al persistir el escenario.';
            this.logger.error('Falla crítica durante la integración', error);
            return { success: false, error: message, filesWritten: [] };
        }
    }

    /**
     * Ejecuta `tsc --noEmit` sobre un archivo temporal con el código generado.
     * Retorna lista de advertencias (non-blocking: errores se reportan, no bloquean).
     */
    private runStaticAnalysis(tsCode: string, featureName: string): string[] {
        const tmpDir = os.tmpdir();
        const tmpFile = path.join(tmpDir, `${featureName.replace(/\s+/g, '_')}_static_check.ts`);

        try {
            fs.writeFileSync(tmpFile, tsCode, 'utf-8');
            this.logger.info('🔍 Ejecutando análisis estático TypeScript (tsc --noEmit)...');

            execSync(`npx tsc --noEmit --allowJs --checkJs false --skipLibCheck --target ES2020 "${tmpFile}"`, {
                stdio: 'pipe',
                timeout: 15_000,
            });

            this.logger.info('✅ Análisis estático: sin errores de tipo.');
            return [];

        } catch (err: unknown) {
            // tsc retorna exit code != 0 cuando hay errores; capturamos stdout/stderr
            const output = err instanceof Error && 'stdout' in err
                ? String((err as NodeJS.ErrnoException & { stdout?: Buffer }).stdout ?? '')
                : String(err);

            const warnings = output
                .split('\n')
                .filter(line => line.trim().length > 0)
                .map(line => line.replace(tmpFile, `<generated:${featureName}>`));

            if (warnings.length > 0) {
                this.logger.warn(`⚠️ Análisis estático encontró ${warnings.length} advertencia(s) — non-blocking.`, { warnings });
            }
            return warnings;
        } finally {
            try { fs.unlinkSync(tmpFile); } catch { /* limpieza best-effort */ }
        }
    }
}
