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
import { McpPlaywrightClient } from '../infrastructure/McpPlaywrightClient';
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
/** Tipo interno para el contenido de respuesta MCP */
interface McpContentItem { type: string; text?: string; }

export class CodeGeneratorAgent implements Agent<CodeGeneratorRequest, CodeGeneratorResponse> {
    readonly name = 'CodeGeneratorAgent';
    private readonly logger: Logger = createLogger(this.name);
    private readonly contextLoader: ProjectContextLoader;

    constructor(
        private readonly aiClient: AIProvider,
        private readonly mcpClient: McpPlaywrightClient | null = null
    ) {
        this.contextLoader = new ProjectContextLoader();
    }

    async run(request: CodeGeneratorRequest): Promise<CodeGeneratorResponse> {
        try {
            this.logger.info(`Generando código Screenplay para "${request.featureName}"...`);

            // 1. Cargar Contexto RAG del proyecto (UI y Tasks actuales)
            const projectContext = this.contextLoader.loadContext();

            const solidDirectives = `
IMPORTANT! The code generated must strictly follow SOLID principles:
- SRP: Each Task/Question does exactly one thing.
- OCP: Classes are open for extension.
- DIP: Rely on Screenplay dependencies and robust locators.
CRITICAL: Output ONLY raw TypeScript code. No JSON, no markdown fences.`;

            const systemPrompt = ScreenplaySystemPrompt.replace(
                '{{PROJECT_CONTEXT}}',
                `${projectContext}\n${solidDirectives}`
            );

            // 2. Extraer snapshot de accesibilidad via Playwright MCP (si disponible)
            let domSnapshot = '';
            if (this.mcpClient) {
                const urlMatch = request.gherkin.match(/https?:\/\/[^\s"]+/);
                if (urlMatch) {
                    const targetUrl = urlMatch[0];
                    this.logger.info(`🌐 URL detectada: ${targetUrl}. Extrayendo Accessibility Tree...`);
                    try {
                        await this.mcpClient.execute('browser_navigate', { url: targetUrl });
                        await this.mcpClient.execute('browser_wait_for', { time: 3 });
                        const snapResult = await this.mcpClient.execute('browser_snapshot', {});
                        const snapshotText = (snapResult.content as McpContentItem[])
                            .find(c => c.type === 'text')?.text ?? '';
                        if (snapshotText) {
                            domSnapshot = `\n\n### LIVE BROWSER SNAPSHOT (Accessibility Tree) ###\nUse this snapshot to build robust locators:\n${snapshotText}\n`;
                            this.logger.info(`📸 Snapshot extraído (${snapshotText.length} bytes).`);
                        }
                    } catch (mcpErr) {
                        this.logger.warn('Fallo extrayendo snapshot de la URL — continuando sin snapshot.', { mcpErr });
                    }
                }
            }

            // 3. Generar código usando ContextBuilder + generateChat (Fase 8 pattern)
            const messages = new ContextBuilder()
                .addSystemPrompt(systemPrompt + domSnapshot)
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
