/**
 * src/ai/core/AgentOrchestrator.ts — Fase 14 (Plug-in Pipeline)
 *
 * The orchestrator no longer knows about specific agents. Instead, it
 * consumes an ordered array of `PipelineStep` instances and runs them in
 * sequence, sharing a `PipelineContext`. Steps decide whether to `continue`,
 * `short-circuit` (cache hit) or `abort`. This opens the pipeline to OCP:
 * new stages can be added without editing this class.
 *
 * Public API is backward-compatible — `executePipeline(requirement, onProgress)`
 * is still the entry point used by `src/api/server.ts`.
 */
import { AgentResponse } from '../agents/Agent';
import { PipelineContext, PipelineStep, ProgressReporter } from './PipelineStep';
import { PreviewResult } from '../agents/ScenarioPreviewRunner';
import { createLogger, Logger } from '../infrastructure/Logger';

export interface OrchestratorResult extends AgentResponse {
    isDuplicate?: boolean;
    gherkin?: string;
    featureName?: string;
    tsCode?: string;
    executionData?: PreviewResult;
    validationPassed?: boolean;
    filesWritten?: string[];
}

export type ProgressCallback = (agent: string, status: string, finished?: boolean) => void;

export class AgentOrchestrator {
    private readonly logger: Logger = createLogger('Orchestrator');

    constructor(private readonly steps: PipelineStep[]) {
        if (steps.length === 0) {
            throw new Error('AgentOrchestrator requiere al menos un PipelineStep configurado.');
        }
    }

    async executePipeline(
        userRequirement: string,
        onProgress?: ProgressCallback,
    ): Promise<OrchestratorResult> {
        const emit: ProgressCallback = (agent, status, finished = false) => {
            this.logger.info(status, { agent });
            onProgress?.(agent, status, finished);
        };

        const context: PipelineContext = {
            userRequirement,
            extras: {},
        };

        emit('Orchestrator', `🚀 Iniciando pipeline para: "${userRequirement}"`);

        for (const step of this.steps) {
            const reporter = this.buildReporter(step.name, emit);
            try {
                const outcome = await step.execute(context, reporter);

                if (outcome.decision === 'short-circuit') {
                    emit('Orchestrator', `⚡ Pipeline completado por short-circuit en ${step.name}${outcome.reason ? `: ${outcome.reason}` : ''}.`, true);
                    return this.projectSuccess(context);
                }

                if (outcome.decision === 'abort') {
                    const message = outcome.reason ?? outcome.error?.message ?? `Fallo en ${step.name}`;
                    this.logger.error(`Paso "${step.name}" abortó el pipeline`, outcome.error);
                    emit('Orchestrator', `💥 Error: ${message}`, true);
                    return { success: false, error: message };
                }
            } catch (error: unknown) {
                // Defensive: a well-behaved step should never throw, but we
                // don't want an exception to leave the SSE connection open.
                const message = error instanceof Error ? error.message : String(error);
                this.logger.error(`Paso "${step.name}" lanzó una excepción no controlada`, error);
                emit('Orchestrator', `💥 Error: ${message}`, true);
                return { success: false, error: message };
            }
        }

        emit('Orchestrator', '✅ Pipeline completado exitosamente.', true);
        return this.projectSuccess(context);
    }

    // ───────────────────────── helpers ─────────────────────────

    private buildReporter(stepName: string, emit: ProgressCallback): ProgressReporter {
        return {
            update: (status: string) => emit(stepName, status, false),
            finish: (status: string) => emit(stepName, status, true),
            emitFor: (agent: string, status: string, finished = false) => emit(agent, status, finished),
        };
    }

    private projectSuccess(context: PipelineContext): OrchestratorResult {
        return {
            success: true,
            isDuplicate: context.isDuplicate ?? false,
            gherkin: context.gherkin,
            featureName: context.featureName,
            tsCode: context.tsCode,
            executionData: context.executionData,
            validationPassed: context.validationPassed,
            filesWritten: context.filesWritten,
        };
    }
}
