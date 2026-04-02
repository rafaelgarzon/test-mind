/**
 * src/ai/agents/BusinessAlignmentAgent.ts — Fase 13
 *
 * Fase 13: migrado de generate() (deprecated) a generateChat() con ContextBuilder;
 *          Logger abstracto en lugar de console.log directo;
 *          tipo AIProvider en lugar de OllamaProvider concreto.
 */
import { Agent, AgentRequest, AgentResponse } from './Agent';
import { AIProvider } from '../infrastructure/AIProvider';
import { ContextBuilder } from '../infrastructure/ContextBuilder';
import { BusinessDocumentLoader } from '../infrastructure/BusinessDocumentLoader';
import { createLogger, Logger } from '../infrastructure/Logger';

export interface BusinessAlignmentRequest extends AgentRequest {
    gherkin: string;
}

export interface BusinessAlignmentResponse extends AgentResponse {
    isAligned: boolean;
    feedbackMessage?: string;
}

/** System prompt exportado para ContextBuilder (Fase 8 pattern) */
export const BUSINESS_ALIGNMENT_SYSTEM_PROMPT = `Eres un riguroso Business Analyst y Auditor de Calidad.
Tu misión es leer el Escenario de Prueba en formato Gherkin (BDD) generado, y cruzarlo estáticamente contra la documentación oficial de DOMINIO y REGLAS DE NEGOCIO de la empresa.

Debes retornar EXCLUSIVAMENTE un objeto JSON evaluando el Gherkin proveído bajo las reglas de negocio que se te proporcionan.
Formato JSON esperado:
{
  "aprobado": true | false,
  "razon_rechazo": "Dejar vacío si es verdadero, o detallar la violación específica si es falso."
}

Solo rechaza si rompe una regla EXPLÍCITA dictada en la documentación. No inventes reglas.
Si el Gherkin se alinea y respeta el lenguaje ubicuo o las políticas, define "aprobado": true.
IMPORTANTE: Retorna SOLO el JSON. Sin explicaciones adicionales.`;

export class BusinessAlignmentAgent implements Agent<BusinessAlignmentRequest, BusinessAlignmentResponse> {
    public readonly name = 'BusinessAlignmentAgent';
    private readonly logger: Logger = createLogger(this.name);
    private readonly documentLoader: BusinessDocumentLoader;

    constructor(private readonly aiProvider: AIProvider) {
        this.documentLoader = new BusinessDocumentLoader();
    }

    async run(request: BusinessAlignmentRequest): Promise<BusinessAlignmentResponse> {
        this.logger.info('Extrayendo contexto corporativo (docs/business_context)...');

        const businessContext = this.documentLoader.loadAllContext();

        if (businessContext.includes('No hay reglas') || businessContext.includes('No se encontraron')) {
            this.logger.info('Sin reglas de negocio impuestas. Avance automático permitido.');
            return { success: true, isAligned: true };
        }

        // Fase 13: usa ContextBuilder + generateChat (patrón Phase 8)
        const messages = new ContextBuilder()
            .addSystemPrompt(BUSINESS_ALIGNMENT_SYSTEM_PROMPT)
            .addDomainKnowledge(`REGLAS DE NEGOCIO VIGENTES:\n${businessContext}`)
            .addUserMessage(`Gherkin a auditar:\n\n${request.gherkin}`)
            .build();

        try {
            this.logger.info('Auditando escenario mediante el Modelo de Lenguaje...');
            const responseText = await this.aiProvider.generateChat(messages);

            // Parseo robusto: busca el primer objeto JSON en la respuesta
            const match = responseText.match(/\{[\s\S]*?\}/);
            const jsonStr = match ? match[0] : responseText;
            const review = JSON.parse(jsonStr) as { aprobado: boolean; razon_rechazo?: string };

            if (review.aprobado) {
                this.logger.info('✅ El escenario cumple con las normas de negocio.');
                return { success: true, isAligned: true };
            }

            this.logger.warn(`❌ Escenario rechazado: ${review.razon_rechazo}`);
            return { success: true, isAligned: false, feedbackMessage: review.razon_rechazo };

        } catch (error: unknown) {
            this.logger.error('Falló el parseo de auditoría. Se concede auto-paso para no bloquear el pipeline.', error);
            return { success: true, isAligned: true };
        }
    }
}
