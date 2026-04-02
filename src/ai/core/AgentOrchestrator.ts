/**
 * src/ai/core/AgentOrchestrator.ts — Fase 13
 *
 * Orquestador maestro del pipeline de 7 agentes especializados.
 * Fase 13: reemplazados todos los tipos `any` por interfaces concretas;
 *          Logger abstracto en lugar de console.log directo.
 */
import { Agent, AgentRequest, AgentResponse } from '../agents/Agent';
import { DuplicatePreventionAgent } from '../agents/DuplicatePreventionAgent';
import { BusinessAlignmentAgent, BusinessAlignmentResponse } from '../agents/BusinessAlignmentAgent';
import { createLogger, Logger } from '../infrastructure/Logger';

export interface OrchestratorResult extends AgentResponse {
    isDuplicate?: boolean;
}

export class AgentOrchestrator {
    private readonly logger: Logger = createLogger('Orchestrator');

    constructor(
        private readonly duplicatePreventionAgent: DuplicatePreventionAgent,
        private readonly businessAlignmentAgent: BusinessAlignmentAgent,
        private readonly requirementsAgent: Agent<AgentRequest, AgentResponse>,
        private readonly codeGeneratorAgent: Agent<AgentRequest, AgentResponse>,
        private readonly validationAgent: Agent<AgentRequest, AgentResponse>,
        private readonly reportingAgent: Agent<AgentRequest, AgentResponse>,
        private readonly reviewImplementerAgent: Agent<AgentRequest, AgentResponse>
    ) {}

    /**
     * Ejecuta el pipeline completo de automatización desde lenguaje natural
     * hasta la implementación en el código (Screenplay/SOLID).
     * @param userRequirement Requerimiento del usuario en lenguaje natural
     * @param onProgress Función callback para recibir actualizaciones en tiempo real (ideal para SSE)
     */
    async executePipeline(
        userRequirement: string,
        onProgress?: (agent: string, status: string) => void
    ): Promise<OrchestratorResult> {
        const emit = (agent: string, status: string): void => {
            this.logger.info(status, { agent });
            onProgress?.(agent, status);
        };

        try {
            emit('Orchestrator', `🚀 Iniciando pipeline para: "${userRequirement}"`);

            // 0. Guardián de duplicados (ChromaDB semántico)
            emit('DuplicatePreventionAgent', 'Buscando similitud semántica en la Base Vectorial...');
            const cacheResult = await this.duplicatePreventionAgent.run({ userRequirement });
            if (cacheResult.isDuplicate) {
                emit('DuplicatePreventionAgent', '⚡ Requerimiento previamente generado. Abortando para ahorrar tokens LLM.');
                return { success: true, isDuplicate: true };
            }

            // Bucle BDD ↔ Negocio (máx. 3 intentos de alineación corporativa)
            let reqResult: AgentResponse & Record<string, unknown> = { success: false };
            let businessFeedback: string | undefined;
            const maxAlignmentAttempts = 3;

            for (let attempt = 1; attempt <= maxAlignmentAttempts; attempt++) {
                emit('RequirementsAgent', `Análisis y generación de Gherkin... (intento negocio ${attempt}/${maxAlignmentAttempts})`);
                reqResult = await this.requirementsAgent.run({ userRequirement, businessFeedback }) as typeof reqResult;
                if (!reqResult.success) throw new Error(reqResult.error ?? 'Fallo en RequirementsAgent');

                emit('BusinessAlignmentAgent', 'Auditando vocabulario y restricciones corporativas...');
                const alignResult = await this.businessAlignmentAgent.run({ gherkin: reqResult['gherkin'] as string }) as BusinessAlignmentResponse;

                if (alignResult.isAligned) {
                    emit('BusinessAlignmentAgent', '✅ Escenario supera la auditoría corporativa.');
                    break;
                }

                businessFeedback = alignResult.feedbackMessage;
                emit('BusinessAlignmentAgent', `❌ Violación detectada. Retroalimentando: "${businessFeedback}"`);

                if (attempt >= maxAlignmentAttempts) {
                    throw new Error(`Límite de correcciones corporativas alcanzado. Último rechazo: ${businessFeedback}`);
                }
            }

            // 2. Gherkin → Código TypeScript (Screenplay + SOLID + Playwright MCP snapshot)
            emit('CodeGeneratorAgent', 'Generando código TS con patrones Screenplay...');
            const codeResult = await this.codeGeneratorAgent.run({
                gherkin: reqResult['gherkin'],
                featureName: reqResult['featureName'],
            }) as AgentResponse & { tsCode?: string };
            if (!codeResult.success) throw new Error(codeResult.error ?? 'Fallo en CodeGeneratorAgent');

            // 3. Validación y preview en navegador
            emit('ValidationAgent', 'Previsualizando escenario en el DOM...');
            const validationResult = await this.validationAgent.run({
                gherkin: reqResult['gherkin'],
                tsCode: codeResult.tsCode,
            }) as AgentResponse & { executionData?: unknown };

            // 4. Reporte (continúa aunque validación falle — documenta el resultado)
            emit('ReportingAgent', 'Consolidando métricas y capturas en reporte final...');
            const reportResult = await this.reportingAgent.run({
                executionData: validationResult.executionData,
                passed: validationResult.success,
            }) as AgentResponse & { reportHtml?: string };
            if (!reportResult.success) emit('ReportingAgent', '⚠️ Fallo generando el reporte HTML/Markdown.');

            if (!validationResult.success) {
                emit('Orchestrator', '❌ Pipeline detenido: validación falló en navegador.');
                return { success: false, error: validationResult.error };
            }

            // 5. Análisis estático + escritura a disco
            emit('ReviewImplementerAgent', 'Integrando archivos Gherkin y TS en el framework...');
            const implResult = await this.reviewImplementerAgent.run({
                gherkin: reqResult['gherkin'],
                featureName: reqResult['featureName'],
                tsCode: codeResult.tsCode,
                report: reportResult.reportHtml,
            }) as AgentResponse & { filesWritten?: string[] };
            if (!implResult.success) throw new Error(implResult.error ?? 'Fallo en ReviewImplementerAgent');

            // Persistir en caché vectorial para evitar duplicados futuros
            emit('DuplicatePreventionAgent', 'Almacenando memoria semántica en ChromaDB...');
            await this.duplicatePreventionAgent.saveToCache(userRequirement, reqResult['gherkin'] as string);

            emit('Orchestrator', '✅ Pipeline completado exitosamente.');
            return { success: true };

        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : String(error);
            this.logger.error('Pipeline falló críticamente', error);
            onProgress?.('Orchestrator', `💥 Error: ${message}`);
            return { success: false, error: message };
        }
    }
}
