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
import { ScreenplaySystemPrompt } from '../prompts/ScreenplaySystemPrompt';
import { createLogger, Logger } from '../infrastructure/Logger';

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

            // 1. Cargar Contexto RAG del proyecto (UI y Tasks actuales)
            const projectContext = this.contextLoader.loadContext();

            const systemPrompt = ScreenplaySystemPrompt.replace(
                '{{PROJECT_CONTEXT}}',
                projectContext
            );

            // 2. Generar código usando ContextBuilder + generateChat (Fase 8 pattern)
            // Nota: el snapshot MCP se omite intencionalmente en este agente —
            // la navegación real ocurre en ValidationAgent/ScenarioPreviewRunner.
            // Enviarlo aquí causaba timeouts de 5 min con llama3.2 en páginas grandes.
            const messages = new ContextBuilder()
                .addSystemPrompt(systemPrompt)
                .addUserMessage(request.gherkin)
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
