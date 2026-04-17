/**
 * src/ai/pipeline/steps/ReviewImplementerStep.ts
 *
 * Wraps ReviewImplementerAgent as a PipelineStep. This is the step that
 * finally writes files to disk, so a failure here aborts the pipeline.
 */
import { Agent, AgentRequest, AgentResponse } from '../../agents/Agent';
import {
    Abort, Continue, PipelineContext, PipelineStep, ProgressReporter, StepOutcome,
} from '../../core/PipelineStep';

interface ImplementerResult extends AgentResponse {
    filesWritten?: string[];
}

export class ReviewImplementerStep implements PipelineStep {
    readonly name = 'ReviewImplementerAgent';

    constructor(private readonly agent: Agent<AgentRequest, AgentResponse>) {}

    async execute(context: PipelineContext, progress: ProgressReporter): Promise<StepOutcome> {
        if (!context.gherkin || !context.featureName || !context.tsCode) {
            return Abort('ReviewImplementerStep requiere gherkin + featureName + tsCode en el contexto');
        }

        progress.update('Integrando archivos Gherkin y TS en el framework...');

        const result = await this.agent.run({
            gherkin: context.gherkin,
            featureName: context.featureName,
            tsCode: context.tsCode,
            report: context.reportHtml,
        }) as ImplementerResult;

        if (!result.success) {
            return Abort(result.error ?? 'Fallo en ReviewImplementerAgent');
        }

        context.filesWritten = result.filesWritten;
        progress.finish('✅ Archivos escritos en el framework.');
        return Continue;
    }
}
