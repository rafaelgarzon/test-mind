/**
 * src/ai/infrastructure/ChromaVectorStore.ts — Fase 13
 *
 * Fase 13: añadida resiliencia completa:
 *  - Manejo de errores de conexión en init() con logging estructurado
 *  - Retry automático (3 intentos con backoff exponencial) en todas las operaciones
 *  - Propiedad `isAvailable` para que los agentes puedan hacer fallback graceful
 *  - Metadatos enriquecidos con timestamp en addScenario
 *  - collectionName configurable via constructor
 */
import { ChromaClient, Collection } from 'chromadb';
import { OllamaEmbeddingFunction } from './OllamaEmbeddingFunction';
import { OllamaProvider } from '../OllamaProvider';
import { createLogger, Logger } from './Logger';

const DEFAULT_MAX_RETRIES = 3;
const RETRY_BASE_DELAY_MS = 500;

export class ChromaVectorStore {
    private readonly logger: Logger = createLogger('ChromaVectorStore');
    private readonly client: ChromaClient;
    private readonly embeddingFunction: OllamaEmbeddingFunction;
    private readonly collectionName: string;
    private collection: Collection | null = null;

    /** true si la última operación de init() tuvo éxito */
    public isAvailable = false;

    constructor(
        chromaUrl = 'http://localhost:8000',
        ollamaProvider: OllamaProvider,
        collectionName = 'scenarios_cache'
    ) {
        this.client = new ChromaClient({ path: chromaUrl });
        this.embeddingFunction = new OllamaEmbeddingFunction(ollamaProvider);
        this.collectionName = collectionName;
    }

    /** Inicializa la colección con retry. Idempotente: seguro llamar múltiples veces. */
    async init(): Promise<void> {
        if (this.collection) return;

        await this.withRetry(async () => {
            this.collection = await this.client.getOrCreateCollection({
                name: this.collectionName,
                embeddingFunction: this.embeddingFunction,
            });
            this.isAvailable = true;
            this.logger.info(`Colección "${this.collectionName}" lista.`);
        }, 'init');
    }

    async addScenario(id: string, requirementText: string, gherkinContent: string): Promise<void> {
        await this.init();
        if (!this.collection) return;

        await this.withRetry(async () => {
            await this.collection!.add({
                ids: [id],
                documents: [requirementText],
                metadatas: [{ gherkin: gherkinContent, createdAt: new Date().toISOString() }],
            });
            this.logger.debug(`Escenario añadido con ID: ${id}`);
        }, 'addScenario');
    }

    async searchSimilar(requirementText: string, nResults = 1) {
        await this.init();
        if (!this.collection) return { distances: [], metadatas: [], documents: [] };

        return this.withRetry(async () => {
            return this.collection!.query({ nResults, queryTexts: [requirementText] });
        }, 'searchSimilar');
    }

    /**
     * Ejecuta `fn` con reintentos y backoff exponencial.
     * Si todos los intentos fallan, marca isAvailable=false y relanza la excepción.
     */
    private async withRetry<T>(fn: () => Promise<T>, operation: string): Promise<T> {
        for (let attempt = 1; attempt <= DEFAULT_MAX_RETRIES; attempt++) {
            try {
                return await fn();
            } catch (err) {
                const isLast = attempt >= DEFAULT_MAX_RETRIES;
                this.logger.warn(
                    `Operación "${operation}" falló (intento ${attempt}/${DEFAULT_MAX_RETRIES}).`,
                    { isLast }
                );
                if (isLast) {
                    this.isAvailable = false;
                    this.collection = null;
                    this.logger.error(`ChromaDB no disponible tras ${DEFAULT_MAX_RETRIES} intentos en "${operation}".`, err);
                    throw err;
                }
                await new Promise(r => setTimeout(r, RETRY_BASE_DELAY_MS * Math.pow(2, attempt - 1)));
            }
        }
        throw new Error(`ChromaVectorStore: flujo inesperado en "${operation}"`);
    }
}
