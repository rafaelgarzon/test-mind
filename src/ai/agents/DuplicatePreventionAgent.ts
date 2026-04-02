import { Agent, AgentRequest, AgentResponse } from './Agent';
import { ChromaVectorStore } from '../infrastructure/ChromaVectorStore';

export interface DuplicatePreventionRequest extends AgentRequest {
    userRequirement: string;
}

export interface DuplicatePreventionResponse extends AgentResponse {
    isDuplicate: boolean;
    cachedGherkin?: string;
    similarityScore?: number;
}

export class DuplicatePreventionAgent implements Agent<DuplicatePreventionRequest, DuplicatePreventionResponse> {
    public readonly name = 'DuplicatePreventionAgent';
    private vectorStore: ChromaVectorStore;
    private similarityThreshold = 0.85; // Si la distancia refleja altísima similitud (>85%)

    constructor(vectorStore: ChromaVectorStore) {
        this.vectorStore = vectorStore;
    }

    async run(request: DuplicatePreventionRequest): Promise<DuplicatePreventionResponse> {
        console.log(`[${this.name}] Consultando ChromaDB para el requerimiento: "${request.userRequirement}"`);
        
        try {
            const results = await this.vectorStore.searchSimilar(request.userRequirement, 1);
            
            // ChromaDB retorna distancias: menor distancia = mayor similitud.
            // Para algunas de sus configuraciones L2, distancia < 0.3 suele ser un buen match.
            // Aquí lo simplificaremos asumiendo una normalización matemática heurística.
            if (results.distances && results.distances[0] && results.distances[0].length > 0) {
                const distance = results.distances[0][0] || 1.0;
                const similarity = 1 - Math.min(distance, 1.0); // Simple inverted distance
                
                if (similarity >= this.similarityThreshold) {
                    const cachedGherkin = results.metadatas[0][0]?.gherkin as string;
                    console.log(`[${this.name}] ¡Coincidencia Exacta encontrada! Similitud: ${similarity.toFixed(2)}`);
                    return {
                        success: true,
                        isDuplicate: true,
                        similarityScore: similarity,
                        cachedGherkin: cachedGherkin
                    };
                }
            }

            console.log(`[${this.name}] No se detectaron duplicados en Caché.`);
            return {
                success: true,
                isDuplicate: false
            };

        } catch (error: any) {
            console.error(`[${this.name}] Error consultando historial de escenarios:`, error);
            // Si la base de datos falla, el workflow debe continuar su ciclo natural y asumir que no hay cache.
            return {
                success: true, 
                isDuplicate: false,
                error: error.message
            };
        }
    }

    async saveToCache(userRequirement: string, gherkinContent: string): Promise<void> {
        const id = `scenario_${Date.now()}`;
        try {
            await this.vectorStore.addScenario(id, userRequirement, gherkinContent);
            console.log(`[${this.name}] Guardado en Caché Vectorial exitosamente con ID: ${id}`);
        } catch (error) {
            console.error(`[${this.name}] Failed to save to cache:`, error);
        }
    }
}
