import * as fs from 'fs';
import * as path from 'path';
import { OpenAIClient } from '../infrastructure/OpenAIClient';
import { ScreenplaySystemPrompt } from '../prompts/ScreenplaySystemPrompt';

export class CodeGenerator {
    private aiClient: OpenAIClient;

    constructor() {
        this.aiClient = new OpenAIClient();
    }

    async generateTestSpecs(scenarioDescription: string, outputFilename: string): Promise<string> {
        console.log(`Generating test for: ${scenarioDescription}`);

        const code = await this.aiClient.generate(ScreenplaySystemPrompt, scenarioDescription);

        const outputPath = path.resolve(process.cwd(), 'src/screenplay/specs', outputFilename);
        this.writeToFile(outputPath, code);

        console.log(`Test generated at: ${outputPath}`);
        return outputPath;
    }

    private writeToFile(filePath: string, content: string): void {
        const dir = path.dirname(filePath);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        fs.writeFileSync(filePath, content);
    }
}
