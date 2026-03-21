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
     */
    async executePipeline(userRequirement: string): Promise<AgentResponse> {
        try {
            console.log(`\n🚀 [Orchestrator] Iniciando pipeline para: "${userRequirement}"`);

            // 1. Requerimientos -> Gherkin
            console.log(`\n[Orchestrator] 1/5 - Ejecutando Agente de Requerimientos...`);
            const reqResult = await this.requirementsAgent.run({ userRequirement });
            if (!reqResult.success) throw new Error(reqResult.error || 'Fallo en RequirementsAgent');

            // 2. Gherkin -> Código (Integrado con Playwright MCP y RAG)
            console.log(`\n[Orchestrator] 2/5 - Ejecutando Agente Generador de Código...`);
            const codeResult = await this.codeGeneratorAgent.run({
                gherkin: reqResult.gherkin,
                featureName: reqResult.featureName,
            });
            if (!codeResult.success) throw new Error(codeResult.error || 'Fallo en CodeGeneratorAgent');

            // 3. Validación y Previsualización
            console.log(`\n[Orchestrator] 3/5 - Ejecutando Agente de Validación Preview...`);
            const validationResult = await this.validationAgent.run({
                gherkin: reqResult.gherkin,
                tsCode: codeResult.tsCode,
            });
            // La validación podría fallar o no, pero el pipeline sigue para reportar
            
            // 4. Reportes
            console.log(`\n[Orchestrator] 4/5 - Ejecutando Agente de Reportes...`);
            const reportResult = await this.reportingAgent.run({
                executionData: validationResult.executionData,
                passed: validationResult.success
            });
            if (!reportResult.success) console.warn('[Orchestrator] Advertencia: Fallo en ReportingAgent', reportResult.error);

            // Si la validación falló, abortar antes de implementar (aunque el reporte ya se haya generado)
            if (!validationResult.success) {
                console.error(`\n❌ [Orchestrator] Pipeline detenido: El escenario de validación falló.`);
                return { success: false, error: validationResult.error };
            }

            // 5. Revisión final e Implementación
            console.log(`\n[Orchestrator] 5/5 - Ejecutando Agente Revisor e Implementador...`);
            const implResult = await this.reviewImplementerAgent.run({
                gherkin: reqResult.gherkin,
                featureName: reqResult.featureName,
                tsCode: codeResult.tsCode,
                report: reportResult.reportHtml
            });

            if (!implResult.success) throw new Error(implResult.error || 'Fallo en ReviewImplementerAgent');

            console.log(`\n✅ [Orchestrator] Pipeline completado exitosamente.`);
            return { success: true };

        } catch (error: any) {
            console.error(`\n💥 [Orchestrator] Pipeline falló criticamente:`, error);
            return { success: false, error: error.message };
        }
    }
}
