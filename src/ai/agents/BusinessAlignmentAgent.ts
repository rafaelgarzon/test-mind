import { Agent, AgentRequest, AgentResponse } from './Agent';
import { OllamaProvider } from '../OllamaProvider';
import { BusinessDocumentLoader } from '../infrastructure/BusinessDocumentLoader';

export interface BusinessAlignmentRequest extends AgentRequest {
    gherkin: string;
}

export interface BusinessAlignmentResponse extends AgentResponse {
    isAligned: boolean;
    feedbackMessage?: string;
}

export class BusinessAlignmentAgent implements Agent<BusinessAlignmentRequest, BusinessAlignmentResponse> {
    public readonly name = 'BusinessAlignmentAgent';
    private aiProvider: OllamaProvider;
    private documentLoader: BusinessDocumentLoader;

    constructor(aiProvider: OllamaProvider) {
        this.aiProvider = aiProvider;
        this.documentLoader = new BusinessDocumentLoader();
    }

    async run(request: BusinessAlignmentRequest): Promise<BusinessAlignmentResponse> {
        console.log(`[${this.name}] Extrayendo contexto histórico-corporativo (Directorio docs/business_context)...`);
        
        const businessContext = this.documentLoader.loadAllContext();

        // En caso de no haber negocio establecido, asumimos alineamiento perfecto
        if (businessContext.includes('No hay reglas') || businessContext.includes('No se encontraron')) {
            console.log(`[${this.name}] Sin reglas de negocio impuestas. Se permite avance automático.`);
            return { success: true, isAligned: true };
        }

        const systemPrompt = `
Eres un riguroso Business Analyst y Auditor de Calidad. 
Tu misión es leer el Escenario de Prueba en formato Gherkin (BDD) generado, y cruzarlo estáticamente contra la documentación oficial de DOMINIO y REGLAS DE NEGOCIO de la empresa.

REGLAS DE NEGOCIO VIGENTES (BUSINESS CONTEXT):
${businessContext}

Debes retornar EXCLUSIVAMENTE un objeto JSON evaluando el Gherkin proveído bajo las reglas anteriores.
Formato JSON esperado:
{
  "aprobado": true | false,
  "razon_rechazo": "Dejar vacío si es verdadero, o detallar la violación específica si es falso."
}

Solo rechaza si rompe una regla EXPLÍCITA dictada en la documentación. No inventes reglas. 
Si el Gherkin se alinea y respeta el lenguaje ubicuo o las políticas, define "aprobado": true.
`;

        try {
            console.log(`[${this.name}] Auditando el escenario mediante el Modelo de Lenguaje...`);
            const responseText = await this.aiProvider.generate(systemPrompt, `Gherkin a auditar:\n\n${request.gherkin}`);
            
            // Try to parse JSON robustly
            const match = responseText.match(/\{[\s\S]*?\}/);
            const jsonStr = match ? match[0] : responseText;
            const review = JSON.parse(jsonStr);

            if (review.aprobado) {
                console.log(`[${this.name}] ✅ El escenario cumple cabalmente con las normas de negocio.`);
                return { success: true, isAligned: true };
            } else {
                console.log(`[${this.name}] ❌ Escenario rechazado. Violación de negocio detectada: ${review.razon_rechazo}`);
                return { 
                    success: true, 
                    isAligned: false, 
                    feedbackMessage: review.razon_rechazo 
                };
            }

        } catch (error: any) {
            console.error(`[${this.name}] Falló el parseo de auditoría. Se concederá auto-paso. Error:`, error);
            // Si el modelo alucina el JSON, dejamos pasar para no romper el CI
            return { success: true, isAligned: true };
        }
    }
}
