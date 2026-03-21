import { Agent, AgentRequest, AgentResponse } from './Agent';
import { ScenarioPreviewRunner, PreviewResult } from './ScenarioPreviewRunner';

export interface ValidationRequest extends AgentRequest {
    gherkin: string;
    tsCode?: string;
}

export interface ValidationResponse extends AgentResponse {
    executionData?: PreviewResult;
}

/**
 * ValidationAgent: Ejecuta el flujo Gherkin en el navegador (Playwright MCP) 
 * comprobando que la lógica Screenplay/DOM funciona correctamente y extrae
 * un snapshot-first para resolver posibles interacciones.
 */
export class ValidationAgent implements Agent<ValidationRequest, ValidationResponse> {
    readonly name = 'ValidationAgent';
    private runner: ScenarioPreviewRunner;

    constructor(runner: ScenarioPreviewRunner) {
        this.runner = runner;
    }

    async run(request: ValidationRequest): Promise<ValidationResponse> {
        try {
            console.log(`\n[ValidationAgent] Ejecutando Preview Runner sobre el documento actual...`);

            // El PreviewRunner ejecuta los pasos descritos en el Gherkin en el navegador
            const result = await this.runner.run(request.gherkin);
            
            console.log(`[ValidationAgent] Prueba ${result.passed ? '✅ PASÓ' : '❌ FALLÓ'} en ${result.totalDurationMs}ms.`);

            if (!result.passed) {
                // Aquí el agente podría retroalimentar al CodeGeneratorAgent con la traza de error en una futura iteración
                return {
                    success: false,
                    error: `La validación de la prueba web falló en el Runner previo al despliegue. Revisa los logs o selectores.`,
                    executionData: result
                };
            }

            return {
                success: true,
                executionData: result
            };

        } catch (error: any) {
            console.error('[ValidationAgent] Excepción crítica durante la ejecución en navegador:', error);
            return {
                success: false,
                error: error.message || 'Error en validación web.'
            };
        }
    }
}
