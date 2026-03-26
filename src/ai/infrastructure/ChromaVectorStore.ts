import { ChromaClient, Collection } from 'chromadb';
import { OllamaEmbeddingFunction } from './OllamaEmbeddingFunction';
import { OllamaProvider } from '../OllamaProvider';

export class ChromaVectorStore {
    private client: ChromaClient;
    private collection: Collection | null = null;
    private embeddingFunction: OllamaEmbeddingFunction;
    private collectionName = 'scenarios_cache';

    constructor(chromaUrl: string = 'http://localhost:8000', ollamaProvider: OllamaProvider) {
        this.client = new ChromaClient({ path: chromaUrl });
        this.embeddingFunction = new OllamaEmbeddingFunction(ollamaProvider);
    }

    async init() {
        if (!this.collection) {
            this.collection = await this.client.getOrCreateCollection({
                name: this.collectionName,
                embeddingFunction: this.embeddingFunction
            });
        }
    }

    async addScenario(id: string, requirementText: string, gherkinContent: string) {
        await this.init();
        await this.collection!.add({
            ids: [id],
            documents: [requirementText],
            metadatas: [{ gherkin: gherkinContent }]
        });
    }

    async searchSimilar(requirementText: string, nResults: number = 1) {
        await this.init();
        const results = await this.collection!.query({
            nResults: nResults,
            queryTexts: [requirementText]
        });
        return results;
    }
}
