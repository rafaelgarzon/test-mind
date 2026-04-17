/**
 * src/ai/pipeline/defaultPipeline.ts
 *
 * Declarative factory for the default 7-step pipeline. Callers (api/server,
 * cli) build the concrete agents and hand them to this factory, which
 * returns an ordered list of PipelineSteps that AgentOrchestrator consumes.
 *
 * To add / remove / swap a step you edit this file — NOT the orchestrator.
 */
import { Agent, AgentRequest, AgentResponse } from '../agents/Agent';
import { BusinessAlignmentAgent } from '../agents/BusinessAlignmentAgent';
import { DuplicatePreventionAgent } from '../agents/DuplicatePreventionAgent';
import { PipelineStep } from '../core/PipelineStep';
import {
    CodeGeneratorStep,
    DuplicatePreventionStep,
    PersistToCacheStep,
    RequirementsStep,
    RequirementsStepOptions,
    ReportingStep,
    ReviewImplementerStep,
    ValidationStep,
} from './steps';

export interface DefaultPipelineAgents {
    duplicatePreventionAgent: DuplicatePreventionAgent;
    businessAlignmentAgent: BusinessAlignmentAgent;
    requirementsAgent: Agent<AgentRequest, AgentResponse>;
    codeGeneratorAgent: Agent<AgentRequest, AgentResponse>;
    validationAgent: Agent<AgentRequest, AgentResponse>;
    reportingAgent: Agent<AgentRequest, AgentResponse>;
    reviewImplementerAgent: Agent<AgentRequest, AgentResponse>;
}

export interface DefaultPipelineOptions {
    requirements?: RequirementsStepOptions;
}

export function buildDefaultPipeline(
    agents: DefaultPipelineAgents,
    options: DefaultPipelineOptions = {},
): PipelineStep[] {
    return [
        new DuplicatePreventionStep(agents.duplicatePreventionAgent),
        new RequirementsStep(agents.requirementsAgent, agents.businessAlignmentAgent, options.requirements),
        new CodeGeneratorStep(agents.codeGeneratorAgent),
        new PersistToCacheStep(agents.duplicatePreventionAgent),
        new ValidationStep(agents.validationAgent),
        new ReportingStep(agents.reportingAgent),
        new ReviewImplementerStep(agents.reviewImplementerAgent),
    ];
}
