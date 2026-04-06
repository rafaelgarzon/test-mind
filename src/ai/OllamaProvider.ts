/**
 * Fase 6 (M-01): OllamaProvider ahora implementa AIProvider.
 * Es el único cliente Ollama activo. OllamaClient queda deprecado.
 */
import axios, { AxiosInstance } from 'axios';
import { AIProvider, Message } from './infrastructure/AIProvider';

export interface OllamaConfig {
    baseUrl: string;
    model: string;
}

export class OllamaProvider implements AIProvider {
    private client: AxiosInstance;
    private model: string;

    constructor(config: OllamaConfig = { baseUrl: 'http://localhost:11434', model: 'llama3.2' }) {
        this.client = axios.create({
            baseURL: config.baseUrl,
            timeout: 300000, // 5 minutes timeout for local generation
        });
        this.model = config.model;
    }

    async isHealthy(): Promise<boolean> {
        try {
            const response = await this.client.get('/');
            return response.status === 200;
        } catch (error) {
            return false;
        }
    }

    async listModels(): Promise<string[]> {
        try {
            const response = await this.client.get('/api/tags');
            return response.data.models.map((m: any) => m.name);
        } catch (error) {
            console.error('Failed to list models:', error);
            return [];
        }
    }

    async pullModel(modelName: string): Promise<void> {
        console.log(`Pulling model ${modelName}...`);
        try {
            await this.client.post('/api/pull', { name: modelName });
            console.log(`Model ${modelName} pulled successfully.`);
        } catch (error) {
            console.error(`Failed to pull model ${modelName}:`, error);
            throw error;
        }
    }

    async ensureModelAvailable(fallbackModel: string = 'tinyllama'): Promise<void> {
        const models = await this.listModels();
        if (!models.includes(this.model)) {
            console.log(`Model ${this.model} not found. Attempting to pull...`);
            try {
                await this.pullModel(this.model);
            } catch (e) {
                console.warn(`Failed to pull ${this.model}. Falling back to ${fallbackModel}.`);
                this.model = fallbackModel;
                if (!models.includes(this.model)) {
                    await this.pullModel(this.model);
                }
            }
        }
    }

    async generateCompletion(prompt: string, options: any = {}): Promise<string> {
        try {
            const response = await this.client.post('/api/generate', {
                model: this.model,
                prompt: prompt,
                stream: false,
                ...options
            });
            return response.data.response;
        } catch (error) {
            console.error('Ollama generation failed:', error);
            throw error;
        }
    }

    getModelName(): string {
        return this.model;
    }

    /**
     * Fase 8: Context Engineering Support (M-03).
     * Usa streaming NDJSON para evitar timeout en respuestas largas con llama3.2.
     * Acumula los chunks y devuelve el contenido completo al terminar.
     */
    async generateChat(messages: Message[]): Promise<string> {
        try {
            const response = await this.client.post('/api/chat', {
                model: this.model,
                messages: messages.map(m => ({ role: m.role, content: m.content })),
                stream: true
            }, { responseType: 'stream' });

            return new Promise<string>((resolve, reject) => {
                let accumulated = '';
                response.data.on('data', (chunk: Buffer) => {
                    const lines = chunk.toString().split('\n').filter(Boolean);
                    for (const line of lines) {
                        try {
                            const parsed = JSON.parse(line) as { message?: { content?: string }; done?: boolean };
                            if (parsed.message?.content) {
                                accumulated += parsed.message.content;
                            }
                        } catch { /* línea incompleta — ignorar */ }
                    }
                });
                response.data.on('end', () => resolve(accumulated));
                response.data.on('error', (err: Error) => reject(err));
            });
        } catch (error) {
            console.error('Ollama chat generation failed:', error);
            throw error;
        }
    }

    /**
     * Fase 12: Integración de Base Vectorial (ChromaDB)
     */
    async generateEmbeddings(prompt: string): Promise<number[]> {
        try {
            const response = await this.client.post('/api/embeddings', {
                model: this.model,
                prompt: prompt
            });
            return response.data.embedding;
        } catch (error) {
            console.error('Ollama embeddings generation failed:', error);
            throw error;
        }
    }

    /**
     * Legacy implementation using /api/generate
     */
    async generate(systemPrompt: string, userPrompt: string): Promise<string> {
        const prompt = `${systemPrompt}\n\nTask: ${userPrompt}`;
        return this.generateCompletion(prompt);
    }
}
