import { Agent, AgentRequest, AgentResponse } from './Agent';
import { AIProvider } from '../infrastructure/AIProvider';
import { ProjectContextLoader } from '../core/ProjectContextLoader';
import { ScreenplaySystemPrompt } from '../prompts/ScreenplaySystemPrompt';
import { McpPlaywrightClient } from '../infrastructure/McpPlaywrightClient';

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
    private aiClient: AIProvider;
    private contextLoader: ProjectContextLoader;
    private mcpClient: McpPlaywrightClient | null;

    constructor(aiClient: AIProvider, mcpClient: McpPlaywrightClient | null = null) {
        this.aiClient = aiClient;
        this.contextLoader = new ProjectContextLoader();
        this.mcpClient = mcpClient;
    }

    async run(request: CodeGeneratorRequest): Promise<CodeGeneratorResponse> {
        try {
            console.log(`\n[CodeGeneratorAgent] Generando código Screenplay para "${request.featureName}"...`);
            
            // 1. Cargar Contexto RAG del proyecto (UI y Tasks actuales)
            const context = this.contextLoader.loadContext();
            
            // 2. Inyectar en el System Prompt los lineamientos SOLID y Contexto
            const solidDirectives = `
                IMPORTANT! The code generated must strictly follow SOLID principles:
                - SRP (Single Responsibility Principle): Each Task/Question does exactly one thing.
                - OCP (Open/Closed Principle): Ensure classes are open for extension.
                - DIP (Dependency Inversion Principle): Rely on Screenplay dependencies and robust locators.
                
                CRITICAL INSTRUCTION: You MUST output ONLY raw TypeScript code. Do NOT output JSON. Do not wrap the response in a JSON object. Just provide the TypeScript file content directly.
            `;
            const prompt = ScreenplaySystemPrompt.replace('{{PROJECT_CONTEXT}}', context + '\n' + solidDirectives);
            
            // [AQUÍ SE IMPLEMENTARÁ LA INTERACCIÓN CON PLAYWRIGHT MCP PARA VALIDAR DOM/SELECTORES]
            let domSnapshot = "";
            if (this.mcpClient) {
                const urlMatch = request.gherkin.match(/https?:\/\/[^\s"]+/);
                if (urlMatch) {
                    const targetUrl = urlMatch[0];
                    console.log(`[CodeGeneratorAgent] 🌐 URL detectada: ${targetUrl}. Extrayendo Accessibility Tree en vivo...`);
                    try {
                        await this.mcpClient.execute('browser_navigate', { url: targetUrl });
                        await this.mcpClient.execute('browser_wait_for', { time: 3 }); // Espera pasiva de carga
                        const snapResult = await this.mcpClient.execute('browser_snapshot', {});
                        const snapshotText = snapResult.content.find((c: any) => c.type === 'text')?.text || '';
                        if (snapshotText) {
                            domSnapshot = `\n\n### LIVE BROWSER SNAPSHOT (Accessibility Tree) ###\nUse this snapshot to build robust locators:\n${snapshotText}\n`;
                            console.log(`[CodeGeneratorAgent] 📸 Snapshot extraído correctamente (${snapshotText.length} bytes).`);
                        }
                    } catch (mcpErr) {
                        console.warn(`[CodeGeneratorAgent] ⚠️ Fallo extrayendo snapshot de la URL:`, mcpErr);
                    }
                }
            }

            // 3. Generar Código
            const rawResponse = await this.aiClient.generate(prompt + domSnapshot, request.gherkin);
            let tsCode = rawResponse;
            
            try {
                // Si el LLM desobedece e incluye un bloque markdown ts, lo extraemos
                const tsMatch = rawResponse.match(/```(?:ts|typescript)([\s\S]*?)```/);
                if (tsMatch && tsMatch[1]) {
                    tsCode = tsMatch[1];
                } else if (rawResponse.startsWith('{')) {
                    // Fallback en caso de que siga usando e inyecte JSON
                    const parsed = JSON.parse(rawResponse);
                    tsCode = parsed.steps || parsed.tsCode || rawResponse;
                }
            } catch (e) {
                // Falla silenciosa y asume que toda la respuesta es código TS
                tsCode = rawResponse.replace(/```(?:ts|typescript|json)?/g, '').trim();
            }

            // Sanitizar saltos de linea perdidos y backticks residuales
            tsCode = tsCode.replace(/```/g, '').trim();

            if (!tsCode) {
                return { success: false, error: 'La generación del código retornó vacía.' };
            }

            console.log(`[CodeGeneratorAgent] Generación exitosa de ${tsCode.split('\n').length} líneas de TypeScript.`);
            return {
                success: true,
                tsCode
            };

        } catch (error: any) {
            console.error('[CodeGeneratorAgent] Fallo en la generación:', error);
            return { success: false, error: error.message };
        }
    }
}
