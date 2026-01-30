import OpenAI from 'openai';
import * as dotenv from 'dotenv';
dotenv.config();

export class OpenAIClient {
    private client: OpenAI;
    private model: string;

    constructor(model: string = 'gpt-4o') {
        this.client = new OpenAI({
            apiKey: process.env.OPENAI_API_KEY,
        });
        this.model = model;
    }

    async generate(systemPrompt: string, userPrompt: string): Promise<string> {
        try {
            const completion = await this.client.chat.completions.create({
                messages: [
                    { role: "system", content: systemPrompt },
                    { role: "user", content: userPrompt }
                ],
                model: this.model,
            });

            let code = completion.choices[0].message.content || '';
            // Clean markdown code blocks if present
            code = code.replace(/```typescript/g, '').replace(/```/g, '');
            return code;
        } catch (error) {
            console.error("Error communicating with OpenAI:", error);
            throw error;
        }
    }
}
