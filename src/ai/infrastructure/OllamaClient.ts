import { AIProvider } from "./AIProvider";
import * as dotenv from 'dotenv';
dotenv.config();

export class OllamaClient implements AIProvider {
    private baseUrl: string;
    private model: string;

    constructor(model: string = 'llama3') { // Default to llama3, user can change via env or arg
        this.baseUrl = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
        this.model = process.env.AI_MODEL || model;
    }

    async generate(systemPrompt: string, userPrompt: string): Promise<string> {
        try {
            const response = await fetch(`${this.baseUrl}/api/generate`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    model: this.model,
                    prompt: `${systemPrompt}\n\nTask: ${userPrompt}`, // Ollama chat/generate format can vary, simple prompt concat for 'generate'
                    stream: false
                })
            });

            if (!response.ok) {
                throw new Error(`Ollama API error: ${response.statusText}`);
            }

            const data = await response.json();
            let code = data.response || '';

            // Clean markdown code blocks if present
            code = code.replace(/```typescript/g, '').replace(/```/g, '');
            return code;

        } catch (error) {
            console.error("Error communicating with Ollama:", error);
            throw error;
        }
    }
}
