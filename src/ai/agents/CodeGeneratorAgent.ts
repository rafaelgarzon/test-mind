/**
 * src/ai/agents/CodeGeneratorAgent.ts — Fase 13
 *
 * Fase 13: migrado de generate() (deprecated) a generateChat() con ContextBuilder;
 *          Logger abstracto; snapshot MCP tipado correctamente (sin `any`).
 */
import { Agent, AgentRequest, AgentResponse } from './Agent';
import { AIProvider } from '../infrastructure/AIProvider';
import { ContextBuilder } from '../infrastructure/ContextBuilder';
import { ProjectContextLoader } from '../core/ProjectContextLoader';
import { createLogger, Logger } from '../infrastructure/Logger';

const STEPS_SYSTEM_PROMPT = `You are a Serenity/JS + Cucumber expert.
Given a Gherkin scenario, output ONLY the TypeScript Step Definitions file.
Rules:
- Import from '@cucumber/cucumber': Given, When, Then
- Import from '@serenity-js/core': actorCalled, actorInTheSpotlight
- Use actorCalled("Actor").attemptsTo(...) pattern
- Reuse existing Tasks/UI if listed in CONTEXT
- Output raw TypeScript only — no markdown fences, no JSON, no explanations`;

export interface CodeGeneratorRequest extends AgentRequest {
    gherkin: string;
    featureName: string;
}

export interface CodeGeneratorResponse extends AgentResponse {
    tsCode?: string; // The generated step definitions code
}

/**
 * CodeGeneratorAgent: Transforma Gherkin en código TypeScript (Screenplay + SOLID).
 * - Integra ProjectContextLoader (RAG) para contexto del proyecto.
 * - Integra validación en vivo vía Playwright MCP (Accessibility Tree).
 */
export class CodeGeneratorAgent implements Agent<CodeGeneratorRequest, CodeGeneratorResponse> {
    readonly name = 'CodeGeneratorAgent';
    private readonly logger: Logger = createLogger(this.name);
    private readonly contextLoader: ProjectContextLoader;

    constructor(
        private readonly aiClient: AIProvider,
        _mcpClient: unknown = null   // reservado para compatibilidad — no se usa en generación
    ) {
        this.contextLoader = new ProjectContextLoader();
    }

    async run(request: CodeGeneratorRequest): Promise<CodeGeneratorResponse> {
        try {
            this.logger.info(`Generando código Screenplay para "${request.featureName}"...`);

            // 1. Cargar Contexto RAG del proyecto (clases existentes para reutilizar)
            const projectContext = this.contextLoader.loadContext();
            const systemPrompt = `${STEPS_SYSTEM_PROMPT}\n\nCONTEXT:\n${projectContext}`;

            // 2. Generar Step Definitions desde Gherkin (sin navegación MCP)
            const messages = new ContextBuilder()
                .addSystemPrompt(systemPrompt)
                .addUserMessage(`Generate step definitions for:\n\n${request.gherkin}`)
                .build();

            const rawResponse = await this.aiClient.generateChat(messages);
            let tsCode = rawResponse;

            try {
                const tsMatch = rawResponse.match(/```(?:ts|typescript)([\s\S]*?)```/);
                if (tsMatch?.[1]) {
                    tsCode = tsMatch[1];
                } else if (rawResponse.trimStart().startsWith('{')) {
                    const parsed = JSON.parse(rawResponse) as Record<string, string>;
                    tsCode = parsed['steps'] ?? parsed['tsCode'] ?? rawResponse;
                }
            } catch {
                tsCode = rawResponse.replace(/```(?:ts|typescript|json)?/g, '').trim();
            }

            tsCode = tsCode.replace(/```/g, '').trim();

            if (!tsCode) {
                return { success: false, error: 'La generación del código retornó vacía.' };
            }

            this.logger.info(`Generación exitosa: ${tsCode.split('\n').length} líneas de TypeScript.`);
            return { success: true, tsCode };

        } catch (error: unknown) {
            this.logger.error('Fallo en la generación', error);
            const message = error instanceof Error ? error.message : String(error);
            return { success: false, error: message };
        }
    }
}
