import { Agent, AgentRequest, AgentResponse } from './Agent';
import { ScenarioGenerator } from '../ScenarioGenerator';

export interface RequirementsRequest extends AgentRequest {
    userRequirement: string;
}

export interface RequirementsResponse extends AgentResponse {
    gherkin: string;
    featureName: string;
}

/**
 * RequirementsAgent: Convierte lenguaje natural a escenarios Gherkin.
 * Se apoya en ScenarioGenerator para RAG, evaluación de calidad obligatoria
 * y refinamiento de Gherkin.
 */
export class RequirementsAgent implements Agent<RequirementsRequest, RequirementsResponse> {
    readonly name = 'RequirementsAgent';
    private generator: ScenarioGenerator;

    constructor() {
        this.generator = new ScenarioGenerator();
    }

    async run(request: RequirementsRequest): Promise<RequirementsResponse> {
        console.log(`\n[RequirementsAgent] Inicializando conexión LLM/KB...`);
        try {
            await this.generator.initialize();

            // Ejecuta generación de escenario con evaluación obligatoria de calidad (GherkinQualityScorer)
            // Internamente ScenarioGenerator realiza max 3 intentos de automejora si la calidad no es suficiente.
            console.log(`[RequirementsAgent] Generando Gherkin para: "${request.userRequirement}"`);
            const result = await this.generator.generateScenario(request.userRequirement, 3);

            if (!result || !result.gherkin) {
                return {
                    success: false,
                    error: 'Fallo al generar un escenario Gherkin válido tras los intentos de automejora.'
                };
            }

            // Extraer el featureName del Gherkin generado
            let featureName = 'generated-feature';
            const featureMatch = result.gherkin.match(/Feature:\s*(.+)/);
            if (featureMatch && featureMatch[1]) {
                featureName = featureMatch[1].trim()
                    .toLowerCase()
                    .replace(/\s+/g, '-')
                    .replace(/[^a-z0-9-]/g, '');
            }

            return {
                success: true,
                gherkin: result.gherkin,
                featureName: featureName || 'generated-scenario',
            };
        } catch (error: any) {
            console.error('[RequirementsAgent] Error interno:', error);
            return {
                success: false,
                error: error.message || 'Error desconocido en RequirementsAgent'
            };
        } finally {
            this.generator.close();
        }
    }
}
