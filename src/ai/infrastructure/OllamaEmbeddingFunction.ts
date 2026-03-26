import { OllamaProvider } from '../OllamaProvider';

export class OllamaEmbeddingFunction {
    private provider: OllamaProvider;

    constructor(provider: OllamaProvider) {
        this.provider = provider;
    }

    public async generate(texts: string[]): Promise<number[][]> {
        const embeddings: number[][] = [];
        for (const text of texts) {
            const embedding = await this.provider.generateEmbeddings(text);
            embeddings.push(embedding);
        }
        return embeddings;
    }
}
