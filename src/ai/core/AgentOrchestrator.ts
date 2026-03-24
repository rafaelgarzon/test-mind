import { Agent, AgentRequest, AgentResponse } from '../agents/Agent';

/**
 * AgentOrchestrator coordina el pipeline de los 5 agentes especializados:
 * 1. RequirementsAgent
 * 2. CodeGeneratorAgent
 * 3. ValidationAgent
 * 4. ReportingAgent
 * 5. ReviewImplementerAgent
 */
export class AgentOrchestrator {
    private requirementsAgent: Agent<any, any>;
    private codeGeneratorAgent: Agent<any, any>;
    private validationAgent: Agent<any, any>;
    private reportingAgent: Agent<any, any>;
    private reviewImplementerAgent: Agent<any, any>;

    constructor(
        requirementsAgent: Agent<any, any>,
        codeGeneratorAgent: Agent<any, any>,
        validationAgent: Agent<any, any>,
        reportingAgent: Agent<any, any>,
        reviewImplementerAgent: Agent<any, any>
    ) {
        this.requirementsAgent = requirementsAgent;
        this.codeGeneratorAgent = codeGeneratorAgent;
        this.validationAgent = validationAgent;
        this.reportingAgent = reportingAgent;
        this.reviewImplementerAgent = reviewImplementerAgent;
    }

    /**
     * Ejecuta el pipeline completo de automatización desde lenguaje natural
     * hasta la implementación en el código (Screenplay/SOLID).
     * @param userRequirement Requerimiento del usuario en lenguaje natural
     * @param onProgress Función callback para recibir actualizaciones en tiempo real (ideal para SSE)
     */
    async executePipeline(
        userRequirement: string, 
        onProgress?: (agent: string, status: string) => void
    ): Promise<AgentResponse> {
        try {
            const emit = (agent: string, status: string) => {
                console.log(`\n[${agent}] ${status}`);
                if (onProgress) onProgress(agent, status);
            };

            emit('Orchestrator', `🚀 Iniciando pipeline para: "${userRequirement}"`);

            // 1. Requerimientos -> Gherkin
            emit('RequirementsAgent', 'Iniciando análisis y generación de Gherkin...');
            const reqResult = await this.requirementsAgent.run({ userRequirement });
            if (!reqResult.success) throw new Error(reqResult.error || 'Fallo en RequirementsAgent');

            // 2. Gherkin -> Código (Integrado con Playwright MCP y RAG)
            emit('CodeGeneratorAgent', 'Generando código TS usando Patrones Screenplay...');
            const codeResult = await this.codeGeneratorAgent.run({
                gherkin: reqResult.gherkin,
                featureName: reqResult.featureName,
            });
            if (!codeResult.success) throw new Error(codeResult.error || 'Fallo en CodeGeneratorAgent');

            // 3. Validación y Previsualización
            emit('ValidationAgent', 'Previsualizando escenario iterativo en el DOM...');
            const validationResult = await this.validationAgent.run({
                gherkin: reqResult.gherkin,
                tsCode: codeResult.tsCode,
            });
            // La validación podría fallar o no, pero el pipeline sigue para reportar
            
            // 4. Reportes
            emit('ReportingAgent', 'Consolidando métricas y capturas en el reporte final...');
            const reportResult = await this.reportingAgent.run({
                executionData: validationResult.executionData,
                passed: validationResult.success
            });
            if (!reportResult.success) emit('ReportingAgent', '⚠️ Fallo generando el reporte HTML/Markdown.');

            // Si la validación falló, abortar antes de implementar
            if (!validationResult.success) {
                emit('Orchestrator', '❌ Pipeline detenido: El escenario de validación falló.');
                return { success: false, error: validationResult.error };
            }

            // 5. Revisión final e Implementación
            emit('ReviewImplementerAgent', 'Integrando los archivos Gherkin y TS en el framework Base...');
            const implResult = await this.reviewImplementerAgent.run({
                gherkin: reqResult.gherkin,
                featureName: reqResult.featureName,
                tsCode: codeResult.tsCode,
                report: reportResult.reportHtml
            });

            if (!implResult.success) throw new Error(implResult.error || 'Fallo en ReviewImplementerAgent');

            emit('Orchestrator', '✅ Pipeline completado exitosamente.');
            return { success: true };

        } catch (error: any) {
            console.error(`\n💥 [Orchestrator] Pipeline falló criticamente:`, error);
            if (onProgress) onProgress('Orchestrator', `💥 Error: ${error.message}`);
            return { success: false, error: error.message };
        }
    }
}
