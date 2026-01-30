import { CodeGenerator } from './core/CodeGenerator';
import { OpenAIClient } from './infrastructure/OpenAIClient';
import { OllamaClient } from './infrastructure/OllamaClient';
import * as dotenv from 'dotenv';
dotenv.config();

// Basic CLI handler
if (require.main === module) {
    const args = process.argv.slice(2);
    if (args.length < 2) {
        console.log("Usage: ts-node src/ai/generator.ts <description> <filename.spec.ts>");
    } else {
        const providerName = process.env.AI_PROVIDER || 'openai';
        let provider;

        if (providerName.toLowerCase() === 'ollama') {
            console.log("Using AI Provider: Ollama");
            provider = new OllamaClient();
        } else {
            console.log("Using AI Provider: OpenAI");
            provider = new OpenAIClient();
        }

        const generator = new CodeGenerator(provider);
        generator.generateTestSpecs(args[0], args[1])
            .catch(err => console.error("Generation failed:", err));
    }
}
