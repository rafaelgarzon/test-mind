/**
 * src/ai/pipeline/steps/DuplicatePreventionStep.ts
 *
 * Wraps the DuplicatePreventionAgent in a PipelineStep. Short-circuits the
 * rest of the pipeline on a cache hit.
 */
import { PipelineStep, PipelineContext, ProgressReporter, StepOutcome, Continue, ShortCircuit } from '../../core/PipelineStep';
import { DuplicatePreventionAgent } from '../../agents/DuplicatePreventionAgent';

export class DuplicatePreventionStep implements PipelineStep {
    readonly name = 'DuplicatePreventionAgent';

    constructor(private readonly agent: DuplicatePreventionAgent) {}

    async execute(context: PipelineContext, progress: ProgressReporter): Promise<StepOutcome> {
        progress.update('Buscando similitud semántica en la base vectorial...');
        const result = await this.agent.run({ userRequirement: context.userRequirement });

        if (result.isDuplicate) {
            context.isDuplicate = true;
            context.gherkin = result.cachedGherkin;
            progress.finish('⚡ Escenario duplicado detectado. Retornando caché.');
            return ShortCircuit('Cache hit on DuplicatePreventionAgent');
        }

        progress.finish('✅ Sin duplicados. Continuando pipeline.');
        return Continue;
    }
}
