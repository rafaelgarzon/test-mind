import * as fs from 'fs';
import * as path from 'path';
import { AIProvider } from '../infrastructure/AIProvider';
import { OpenAIClient } from '../infrastructure/OpenAIClient';
import { ScreenplaySystemPrompt } from '../prompts/ScreenplaySystemPrompt';

export class CodeGenerator {
    private aiClient: AIProvider;

    constructor(provider: AIProvider) {
        this.aiClient = provider;
    }

    async generateTestSpecs(scenarioDescription: string, outputFilename: string): Promise<string> {
        console.log(`Generating Cucumber test for: ${scenarioDescription}`);

        const resultRaw = await this.aiClient.generate(ScreenplaySystemPrompt, scenarioDescription);

        let resultJson;
        try {
            // cleaner fallback for simple markdown cleanup
            const cleanJson = resultRaw.replace(/```json/g, '').replace(/```/g, '').trim();
            resultJson = JSON.parse(cleanJson);
        } catch (e) {
            console.error("Failed to parse AI response as JSON", resultRaw);
            throw new Error("AI response was not valid JSON");
        }

        // ensure dirs exist
        const featuresDir = path.resolve(process.cwd(), 'features');
        const stepsDir = path.resolve(process.cwd(), 'features/step_definitions');

        if (!fs.existsSync(featuresDir)) fs.mkdirSync(featuresDir, { recursive: true });
        if (!fs.existsSync(stepsDir)) fs.mkdirSync(stepsDir, { recursive: true });

        const featurePath = path.resolve(featuresDir, resultJson.featureFilename);
        const stepsPath = path.resolve(stepsDir, resultJson.stepsFilename);

        this.writeToFile(featurePath, resultJson.feature);
        this.writeToFile(stepsPath, resultJson.steps);

        console.log(`Feature generated at: ${featurePath}`);
        console.log(`Steps generated at: ${stepsPath}`);
        return featurePath;
    }

    private writeToFile(filePath: string, content: string): void {
        const dir = path.dirname(filePath);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        fs.writeFileSync(filePath, content);
    }
}
