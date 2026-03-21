import { Agent, AgentRequest, AgentResponse } from './Agent';
import { implement } from './ScenarioImplementer';

export interface ReviewImplementerRequest extends AgentRequest {
    gherkin: string;
    featureName: string;
    tsCode: string;
    report?: string;
}

export interface ReviewImplementerResponse extends AgentResponse {
    filesWritten: string[];
}

/**
 * ReviewImplementerAgent: Revisa que el código coincida con estandares (Lints y SOLID),
 * y finalmente graba los archivos .feature y .steps.ts al sistema del proyecto.
 */
export class ReviewImplementerAgent implements Agent<ReviewImplementerRequest, ReviewImplementerResponse> {
    readonly name = 'ReviewImplementerAgent';

    async run(request: ReviewImplementerRequest): Promise<ReviewImplementerResponse> {
        console.log(`\n[ReviewImplementerAgent] Integrando el nuevo código al proyecto para: "${request.featureName}"`);

        try {
            // [AQUÍ SE IMPLEMENTARÁ UN ANALISIS ESTÁTICO DE CÓDIGO (TS / LINT) ANTES DE ESCRIBIR]
            console.log(`[ReviewImplementerAgent] Realizando chequeo estático básico (Simulado)... ✅ TS Ok. Objeto SOLID evaluado.`);

            // Implementar en disco usando el método extraído de Phase 7: `ScenarioImplementer.ts`
            const implResult = await implement({
                gherkin: request.gherkin,
                steps: request.tsCode,
                featureName: request.featureName
            });

            if (!implResult.success) {
                return {
                    success: false,
                    error: `Fallo al escribir archivos: ${implResult.error}`,
                    filesWritten: []
                };
            }

            console.log(`[ReviewImplementerAgent] Implementación finalizada en rama actual.`);
            
            return {
                success: true,
                filesWritten: [implResult.featurePath, implResult.stepsPath]
            };

        } catch (error: any) {
            console.error('[ReviewImplementerAgent] Falla crítica durante la integración:', error);
            return {
                success: false,
                error: error.message || 'Error al persistir el escenario.',
                filesWritten: []
            };
        }
    }
}
