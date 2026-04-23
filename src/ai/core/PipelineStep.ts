/**
 * src/ai/core/PipelineStep.ts
 *
 * Contracts for a plug-in pipeline architecture.
 *
 * Why: the old AgentOrchestrator hard-codes the 7-agent sequence. Adding or
 * skipping a step required editing the orchestrator and its tests. The
 * PipelineStep abstraction turns the pipeline into a declarative list of
 * steps that can be composed, reordered or feature-flagged at configuration
 * time (OCP + DIP).
 *
 * Each step:
 *  - reads & writes a shared `PipelineContext` (the "blackboard")
 *  - returns a `StepOutcome` telling the orchestrator whether to continue,
 *    short-circuit (cache hit), or abort
 *  - emits lifecycle events via a `ProgressReporter` instead of calling
 *    `onProgress` directly (so tests don't have to deal with SSE)
 */
import type { PreviewResult } from '../agents/ScenarioPreviewRunner';

/** Shared state passed through every step of the pipeline. */
export interface PipelineContext {
    /** The original user-language requirement. */
    readonly userRequirement: string;

    /** Generated Gherkin (set by RequirementsStep). */
    gherkin?: string;

    /** Feature name extracted from the Gherkin (set by RequirementsStep). */
    featureName?: string;

    /** Generated TypeScript step definitions (set by CodeGeneratorStep). */
    tsCode?: string;

    /** Preview/validation execution report (set by ValidationStep). */
    executionData?: PreviewResult;

    /** true if the validation step succeeded (set by ValidationStep). */
    validationPassed?: boolean;

    /** Rendered HTML report (set by ReportingStep). */
    reportHtml?: string;

    /** Files that ReviewImplementerStep actually wrote to disk. */
    filesWritten?: string[];

    /** Set by DuplicatePreventionStep when a cache hit is detected. */
    isDuplicate?: boolean;

    /** Feedback from the BusinessAlignmentStep when a Gherkin is rejected. */
    businessFeedback?: string;

    /** Generic bag for steps that need to share extra state without casting. */
    extras: Record<string, unknown>;
}

/** What a step wants the orchestrator to do after it finishes. */
export type StepDecision =
    | 'continue'     // normal completion; run the next step
    | 'short-circuit'// stop early with success (used for cache hits)
    | 'abort';       // stop with failure

export interface StepOutcome {
    decision: StepDecision;
    /** Human-readable reason (surfaced in progress events and logs). */
    reason?: string;
    /** Optional error (only for `abort`). */
    error?: Error;
}

/** Stable outcome helpers to avoid typos in call sites. */
export const Continue: StepOutcome = { decision: 'continue' };
export const ShortCircuit = (reason: string): StepOutcome => ({ decision: 'short-circuit', reason });
export const Abort = (reason: string, error?: unknown): StepOutcome => ({
    decision: 'abort',
    reason,
    error: error instanceof Error ? error : new Error(reason),
});

/** Callbacks every step can use to emit progress. Thin abstraction over SSE. */
export interface ProgressReporter {
    /** Non-terminal status update for the currently running step. */
    update(status: string): void;
    /** Terminal status update (status + finished=true). */
    finish(status: string): void;
    /** Emit a custom event for a different actor (e.g. a sub-agent). */
    emitFor(agent: string, status: string, finished?: boolean): void;
}

/** The plug-in contract. */
export interface PipelineStep {
    /** Display name — surfaced in SSE events and logs. */
    readonly name: string;

    /**
     * Executes the step. Must mutate `context` in-place when producing
     * outputs, and must never throw — return `Abort(...)` instead so the
     * orchestrator can convert that to a structured failure.
     */
    execute(context: PipelineContext, progress: ProgressReporter): Promise<StepOutcome>;
}
