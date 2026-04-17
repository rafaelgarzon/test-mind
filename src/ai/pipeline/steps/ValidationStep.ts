/**
 * src/ai/pipeline/steps/ValidationStep.ts
 *
 * Wraps ValidationAgent. NOT blocking: a validation failure is recorded in
 * the context but the pipeline continues so we still produce a report.
 */
import { Agent, AgentRequest, AgentResponse } from '../../agents/Agent';
import { PreviewResult } from '../../agents/ScenarioPreviewRunner';
import {
    Continue, PipelineContext, PipelineStep, ProgressReporter, StepOutcome,
} from '../../core/PipelineStep';

interface ValidationResult extends AgentResponse {
    executionData?: PreviewResult;
}

export class ValidationStep implements PipelineStep {
    readonly name = 'ValidationAgent';

    constructor(private readonly agent: Agent<AgentRequest, AgentResponse>) {}

    async execute(context: PipelineContext, progress: ProgressReporter): Promise<StepOutcome> {
        progress.update('Previsualizando escenario en el DOM...');

        const result = await this.agent.run({
            gherkin: context.gherkin,
            tsCode: context.tsCode,
        }) as ValidationResult;

        context.executionData = result.executionData;
        context.validationPassed = result.success;

        progress.finish(
            result.success
                ? '✅ Validación exitosa.'
                : '⚠️ Validación con observaciones (no bloqueante).',
        );
        return Continue;
    }
}
