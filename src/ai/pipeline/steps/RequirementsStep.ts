/**
 * src/ai/pipeline/steps/RequirementsStep.ts
 *
 * Wraps the Requirements ↔ BusinessAlignment loop (max N attempts) in a
 * single PipelineStep. Pulling the loop out of the orchestrator means the
 * retry policy is now a configurable property of the step, not a hard-coded
 * constant inside AgentOrchestrator.
 */
import { Agent, AgentRequest, AgentResponse } from '../../agents/Agent';
import { BusinessAlignmentAgent, BusinessAlignmentResponse } from '../../agents/BusinessAlignmentAgent';
import {
    Abort, Continue, PipelineContext, PipelineStep, ProgressReporter, StepOutcome,
} from '../../core/PipelineStep';

interface RequirementsResult extends AgentResponse {
    gherkin?: string;
    featureName?: string;
}

export interface RequirementsStepOptions {
    /** Max Requirements ↔ BusinessAlignment attempts. Defaults to 3. */
    maxAlignmentAttempts?: number;
}

export class RequirementsStep implements PipelineStep {
    readonly name = 'RequirementsAgent';
    private readonly maxAttempts: number;

    constructor(
        private readonly requirementsAgent: Agent<AgentRequest, AgentResponse>,
        private readonly businessAlignmentAgent: BusinessAlignmentAgent,
        options: RequirementsStepOptions = {},
    ) {
        this.maxAttempts = options.maxAlignmentAttempts ?? 3;
    }

    async execute(context: PipelineContext, progress: ProgressReporter): Promise<StepOutcome> {
        let reqResult: RequirementsResult = { success: false };
        let businessFeedback: string | undefined;

        for (let attempt = 1; attempt <= this.maxAttempts; attempt++) {
            progress.update(`Análisis y generación de Gherkin... (intento negocio ${attempt}/${this.maxAttempts})`);

            reqResult = await this.requirementsAgent.run({
                userRequirement: context.userRequirement,
                businessFeedback,
            }) as RequirementsResult;

            if (!reqResult.success) {
                return Abort(reqResult.error ?? 'Fallo en RequirementsAgent');
            }

            progress.emitFor('BusinessAlignmentAgent', 'Auditando vocabulario y restricciones corporativas...');
            const alignResult = await this.businessAlignmentAgent.run({
                gherkin: reqResult.gherkin ?? '',
            }) as BusinessAlignmentResponse;

            if (alignResult.isAligned) {
                progress.finish('✅ Gherkin generado y aprobado.');
                progress.emitFor('BusinessAlignmentAgent', '✅ Escenario supera la auditoría corporativa.', true);

                context.gherkin = reqResult.gherkin;
                context.featureName = reqResult.featureName;
                context.businessFeedback = undefined;
                return Continue;
            }

            businessFeedback = alignResult.feedbackMessage;
            progress.emitFor(
                'BusinessAlignmentAgent',
                `❌ Violación detectada. Retroalimentando: "${businessFeedback}"`,
            );

            if (attempt >= this.maxAttempts) {
                progress.finish('⚠️ Máximo de intentos alcanzado.');
                progress.emitFor('BusinessAlignmentAgent', '⚠️ Alineación corporativa no superada.', true);
                return Abort(`Límite de correcciones corporativas alcanzado. Último rechazo: ${businessFeedback}`);
            }
        }

        return Abort('Flujo inesperado en RequirementsStep');
    }
}
