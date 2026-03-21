import { Agent, AgentRequest, AgentResponse } from './Agent';
import { PreviewResult } from './ScenarioPreviewRunner';

export interface ReportingRequest extends AgentRequest {
    executionData: PreviewResult;
    passed: boolean;
}

export interface ReportingResponse extends AgentResponse {
    reportHtml?: string;
}

/**
 * ReportingAgent: Toma los logs de ejecución, métricas y resultados y genera
 * un reporte Markdown / HTML estandarizado para visualización y revisión.
 */
export class ReportingAgent implements Agent<ReportingRequest, ReportingResponse> {
    readonly name = 'ReportingAgent';

    async run(request: ReportingRequest): Promise<ReportingResponse> {
        console.log(`\n[ReportingAgent] Generando reporte visual de pruebas...`);
        
        try {
            const result = request.executionData;
            const statusIcon = request.passed ? '✅ PASSED' : '❌ FAILED';
            
            // Construir un Markdown base que luego podría inyectarse a Allure o Cucumber HTML
            let md = `# Reporte de Ejecución - Automatización
            
## Resultado Global: ${statusIcon}
- **Browser Usado:** ${result.browserUsed}
- **Tiempo de ejecución total:** ${result.totalDurationMs}ms
- **Pasos validados:** ${result.steps.length}

### Detalle por Paso
`;

            for (const step of result.steps) {
                const icon = step.status === 'passed' ? '🟢' : step.status === 'skipped' ? '⏭️' : '🔴';
                md += `- ${icon} **${step.keyword}** ${step.stepText} (${step.durationMs}ms)\n`;
                if (step.error) {
                    md += `  - **Error:** ${step.error}\n`;
                }
                if (step.screenshotBase64) {
                    // Evidencias Base64
                    md += `  - *Evidencia Capturada (Base64 length: ${step.screenshotBase64.length})*\n`;
                }
            }

            md += `\n---\n*Generado automáticamente por ReportingAgent - Automation Front AI*`;

            return {
                success: true,
                reportHtml: md // Se renombra internamente a Markdown de momento, pero la interfaz es html
            };

        } catch (error: any) {
            console.error('[ReportingAgent] Error al construir el reporte:', error);
            return {
                success: false,
                error: error.message || 'Error generando del reporte.'
            };
        }
    }
}
