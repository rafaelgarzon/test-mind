/**
 * src/ai/pipeline/steps/PersistToCacheStep.ts
 *
 * Writes the generated Gherkin to the vector store so that future requests
 * for the same requirement get a cache hit via DuplicatePreventionStep.
 *
 * Placed AFTER CodeGeneratorStep and BEFORE ValidationStep — that way a
 * failing validation (non-blocking) doesn't prevent the Gherkin from being
 * cached.
 */
import { DuplicatePreventionAgent } from '../../agents/DuplicatePreventionAgent';
import {
    Continue, PipelineContext, PipelineStep, ProgressReporter, StepOutcome,
} from '../../core/PipelineStep';

export class PersistToCacheStep implements PipelineStep {
    readonly name = 'DuplicatePreventionAgent';

    constructor(private readonly agent: DuplicatePreventionAgent) {}

    async execute(context: PipelineContext, progress: ProgressReporter): Promise<StepOutcome> {
        if (!context.gherkin) {
            // Nothing to cache — upstream steps must have failed.
            return Continue;
        }

        progress.update('Almacenando Gherkin en memoria semántica...');
        await this.agent.saveToCache(context.userRequirement, context.gherkin);
        progress.finish('✅ Guardado en caché vectorial.');
        return Continue;
    }
}
