import * as fs from 'fs';
import * as path from 'path';
import { AIProvider } from '../infrastructure/AIProvider';
import { DuplicateCheckPrompt } from '../prompts/DuplicateCheckPrompt';

export class DuplicateDetector {
    constructor(private aiClient: AIProvider) { }

    async checkForDuplicates(newRequest: string): Promise<{ isDuplicate: boolean; reason?: string; existingFile?: string }> {
        const featuresDir = path.resolve(process.cwd(), 'features');
        if (!fs.existsSync(featuresDir)) return { isDuplicate: false };

        // Read all .feature files
        const files = fs.readdirSync(featuresDir).filter(f => f.endsWith('.feature'));
        if (files.length === 0) return { isDuplicate: false };

        const existingScenarios = files.map(file => {
            const content = fs.readFileSync(path.join(featuresDir, file), 'utf-8');
            // Extract Feature and Scenario lines to save tokens
            const summary = content.split('\n')
                .filter(line => line.trim().startsWith('Feature:') || line.trim().startsWith('Scenario:'))
                .join('\n');
            return `File: ${file}\n${summary}`;
        }).join('\n---\n');

        const prompt = DuplicateCheckPrompt
            .replace('{{EXISTING_SCENARIOS}}', existingScenarios)
            .replace('{{NEW_REQUEST}}', newRequest);

        console.log("Analyzing for potential duplicates...");
        const resultRaw = await this.aiClient.generate("You are a strict duplication checker.", prompt);

        try {
            const cleanJson = resultRaw.replace(/```json/g, '').replace(/```/g, '').trim();
            return JSON.parse(cleanJson);
        } catch (e) {
            console.warn("Failed to parse duplicate check response. Assuming not duplicate.");
            return { isDuplicate: false };
        }
    }
}
