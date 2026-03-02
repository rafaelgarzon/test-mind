import { OllamaProvider } from './OllamaProvider';
import { KnowledgeBase } from '../db/KnowledgeBase';
import { GHERKIN_PROMPT_TEMPLATE, SCENARIO_VALIDATION_PROMPT_TEMPLATE, LEARNING_FEEDBACK_PROMPT_TEMPLATE } from './PromptTemplates';

export class ScenarioGenerator {
    private ollama: OllamaProvider;
    private kb: KnowledgeBase;

    constructor() {
        this.ollama = new OllamaProvider();
        this.kb = new KnowledgeBase();
    }

    async initialize() {
        try {
            await this.ollama.ensureModelAvailable();
        } catch (error: any) {
            console.error('\n❌ Error al conectar con Ollama.');
            console.error('Asegúrate de que Docker esté corriendo y el contenedor de Ollama esté activo.');
            console.error('Ejecuta: "docker-compose up -d ollama"\n');
            console.error(`Detalle del error: ${error.message || error}`);

            // Don't exit process here, just let the caller handle it or continue with limited functionality if possible, 
            // but for now, since it's critical, we just log it loud.
            throw new Error("Ollama connection failed");
        }
    }

    async generateScenario(userRequirement: string): Promise<string | null> {
        console.log(`Generating scenario for: "${userRequirement}"`);

        // Check if similar scenario already exists in KB (simple keyword search for now as "cache hit" proxy)
        // In a real V2 agent, we would use vector search.
        const existing = await this.kb.searchScenarios(userRequirement);
        if (existing.length > 0) {
            console.log('Similar scenarios found in Knowledge Base:');
            existing.forEach(s => console.log(`- [ID ${s.id}] ${s.description}`));
            // For now, we still generate, but in future we could return existing.
        }

        const prompt = GHERKIN_PROMPT_TEMPLATE.replace('{requirement}', userRequirement);

        try {
            const gherkin = await this.ollama.generateCompletion(prompt);

            // Try to force complete if the model just returns steps
            let finalGherkin = gherkin.trim();
            if (!finalGherkin.includes('Scenario:')) {
                finalGherkin = `Feature: Generated Feature\nScenario: Generated Scenario for ${userRequirement}\n${finalGherkin}`;
            }

            // Syntax Validation
            if (!this.validateGherkinSyntax(finalGherkin)) {
                console.error('Generated Gherkin is syntactically invalid.');
                return null;
            }

            // Semantic Validation
            const isSemanticallyValid = await this.validateGherkinSemantic(userRequirement, finalGherkin);
            if (!isSemanticallyValid) {
                console.error('Generated Gherkin is semantically invalid for the requirement.');
                return null;
            }

            // Save to KB
            await this.kb.addScenario(userRequirement, finalGherkin);

            return finalGherkin;
        } catch (error) {
            console.error('Error during generation:', error);
            return null;
        }
    }

    async generateScenariosBatch(requirements: string[]): Promise<(string | null)[]> {
        console.log(`\n📦 Starting batch processing for ${requirements.length} requirements...`);
        const results: (string | null)[] = [];

        for (let i = 0; i < requirements.length; i++) {
            console.log(`\n⏳ Processing requirement ${i + 1}/${requirements.length}`);
            const result = await this.generateScenario(requirements[i]);
            results.push(result);
        }

        console.log(`\n✅ Finished batch processing.`);
        return results;
    }

    private validateGherkinSyntax(content: string): boolean {
        const hasScenario = content.includes('Scenario:') || content.includes('Scenario Outline:');
        const hasSteps = content.includes('Given') || content.includes('When') || content.includes('Then');

        return hasScenario && hasSteps;
    }

    private async validateGherkinSemantic(requirement: string, gherkin: string): Promise<boolean> {
        console.log('Validating scenario semantics...');
        const prompt = SCENARIO_VALIDATION_PROMPT_TEMPLATE
            .replace('{requirement}', requirement)
            .replace('{scenario}', gherkin);

        try {
            const validationResult = await this.ollama.generateCompletion(prompt);
            if (validationResult.trim().toUpperCase().startsWith('VALID')) {
                return true;
            } else {
                console.error(`Semantic Validation Failed: ${validationResult}`);
                return false;
            }
        } catch (error) {
            console.error('Error during semantic validation:', error);
            // Default to true if validation fails to avoid blocking the user entirely if LLM is flaky
            return true;
        }
    }

    async improveFailedScenario(scenarioId: number): Promise<string | null> {
        // This is a simple implementation of the feedback cycle.
        // It fetches a failed scenario, sends it to the LLM with the error, and generates a new version.
        try {
            const failedScenarios = await this.kb.getFailedScenarios(50);
            const target = failedScenarios.find(s => s.id === scenarioId);
            if (!target) {
                console.error(`Failed scenario with ID ${scenarioId} not found.`);
                return null;
            }

            console.log(`\n🧠 Initiating learning cycle for scenario ID: ${scenarioId}...`);
            const prompt = LEARNING_FEEDBACK_PROMPT_TEMPLATE
                .replace('{requirement}', target.description)
                .replace('{scenario}', target.gherkin_content)
                .replace('{error}', target.execution_error || 'Unknown execution error.');

            const improvedGherkin = await this.ollama.generateCompletion(prompt);

            if (!this.validateGherkinSyntax(improvedGherkin)) {
                console.error('Improved Gherkin is syntactically invalid.');
                return null;
            }

            // Save the improved scenario as a new entry. In a real system you might want to version it.
            await this.kb.addScenario(`${target.description} (Improved from ID ${scenarioId})`, improvedGherkin);
            console.log(`✅ Learning cycle complete.`);

            // Mark the old one as 'resolved' or similar if needed, for now we just keep it as failed.

            return improvedGherkin;
        } catch (error) {
            console.error('Error during learning cycle:', error);
            return null;
        }
    }

    async generateStepDefinitions(gherkinScenario: string): Promise<string | null> {
        console.log('Generating step definitions...');
        const prompt = (await import('./PromptTemplates')).STEP_DEFINITION_PROMPT_TEMPLATE.replace('{scenario}', gherkinScenario);

        try {
            const steps = await this.ollama.generateCompletion(prompt);
            return steps;
        } catch (error) {
            console.error('Error generating step definitions:', error);
            return null;
        }
    }

    close() {
        this.kb.close();
    }
}
