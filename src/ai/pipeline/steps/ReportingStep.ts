/**
 * src/ai/pipeline/steps/ReportingStep.ts
 *
 * Wraps ReportingAgent as a PipelineStep.
 */
import { Agent, AgentRequest, AgentResponse } from '../../agents/Agent';
import {
    Continue, PipelineContext, PipelineStep, ProgressReporter, StepOutcome,
} from '../../core/PipelineStep';

interface ReportingResult extends AgentResponse {
    reportHtml?: string;
}

export class ReportingStep implements PipelineStep {
    readonly name = 'ReportingAgent';

    constructor(private readonly agent: Agent<AgentRequest, AgentResponse>) {}

    async execute(context: PipelineContext, progress: ProgressReporter): Promise<StepOutcome> {
        progress.update('Consolidando métricas y capturas en reporte final...');

        const result = await this.agent.run({
            executionData: context.executionData,
            passed: context.validationPassed ?? false,
        }) as ReportingResult;

        context.reportHtml = result.reportHtml;
        progress.finish('✅ Reporte generado.');
        return Continue;
    }
}
