/**
 * src/ai/pipeline/steps/CodeGeneratorStep.ts
 *
 * Wraps CodeGeneratorAgent as a PipelineStep.
 */
import { Agent, AgentRequest, AgentResponse } from '../../agents/Agent';
import {
    Abort, Continue, PipelineContext, PipelineStep, ProgressReporter, StepOutcome,
} from '../../core/PipelineStep';

interface CodeGeneratorResult extends AgentResponse {
    tsCode?: string;
}

export class CodeGeneratorStep implements PipelineStep {
    readonly name = 'CodeGeneratorAgent';

    constructor(private readonly agent: Agent<AgentRequest, AgentResponse>) {}

    async execute(context: PipelineContext, progress: ProgressReporter): Promise<StepOutcome> {
        if (!context.gherkin || !context.featureName) {
            return Abort('CodeGeneratorStep requiere gherkin + featureName en el contexto');
        }

        progress.update('Generando código TS con patrones Screenplay...');
        const result = await this.agent.run({
            gherkin: context.gherkin,
            featureName: context.featureName,
        }) as CodeGeneratorResult;

        if (!result.success || !result.tsCode) {
            return Abort(result.error ?? 'Fallo en CodeGeneratorAgent');
        }

        context.tsCode = result.tsCode;
        progress.finish('✅ Código TypeScript generado.');
        return Continue;
    }
}
