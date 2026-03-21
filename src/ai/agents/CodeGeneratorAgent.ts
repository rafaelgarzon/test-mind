import { Agent, AgentRequest, AgentResponse } from './Agent';
import { AIProvider } from '../infrastructure/AIProvider';
import { ProjectContextLoader } from '../core/ProjectContextLoader';
import { ScreenplaySystemPrompt } from '../prompts/ScreenplaySystemPrompt';

export interface CodeGeneratorRequest extends AgentRequest {
    gherkin: string;
    featureName: string;
}

export interface CodeGeneratorResponse extends AgentResponse {
    tsCode: string; // The generated step definitions code
}

/**
 * CodeGeneratorAgent: Transforma Gherkin en código TypeScript (Screenplay + SOLID).
 * - Integra ProjectContextLoader (RAG) para contexto del proyecto.
 * - Integra validación en vivo vía Playwright MCP (futura extensión).
 */
export class CodeGeneratorAgent implements Agent<CodeGeneratorRequest, CodeGeneratorResponse> {
    readonly name = 'CodeGeneratorAgent';
    private aiClient: AIProvider;
    private contextLoader: ProjectContextLoader;

    constructor(aiClient: AIProvider) {
        this.aiClient = aiClient;
        this.contextLoader = new ProjectContextLoader();
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
            `;
            const prompt = ScreenplaySystemPrompt.replace('{{PROJECT_CONTEXT}}', context + '\n' + solidDirectives);
            
            // [AQUÍ SE IMPLEMENTARÁ LA INTERACCIÓN CON PLAYWRIGHT MCP PARA VALIDAR DOM/SELECTORES]
            console.log(`[CodeGeneratorAgent] Integración Playwright MCP planificada para validación de selectores in-vivo.`);

            // 3. Generar Código
            const rawResponse = await this.aiClient.generate(prompt, request.gherkin);
            let tsCode = '';
            
            try {
                // Limpiar JSON fallback (si el output viene en Markdown block `json o `ts)
                const cleanStr = rawResponse.replace(/```(?:json|ts|typescript)/g, '').replace(/```/g, '').trim();
                const resultJson = JSON.parse(cleanStr);
                tsCode = resultJson.steps || resultJson.tsCode || cleanStr;
            } catch (e) {
                // Es posible que el AI entregue código crudo en lugar de JSON
                tsCode = rawResponse.replace(/```(?:ts|typescript)/g, '').replace(/```/g, '').trim();
            }

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
