import { OllamaProvider } from './OllamaProvider';
import { KnowledgeBase } from '../db/KnowledgeBase';
import { GHERKIN_PROMPT_TEMPLATE } from './PromptTemplates';

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

            // Basic Validation
            if (!this.validateGherkin(gherkin)) {
                console.error('Generated Gherkin is invalid.');
                return null;
            }

            // Save to KB
            await this.kb.addScenario(userRequirement, gherkin);

            return gherkin;
        } catch (error) {
            console.error('Error during generation:', error);
            return null;
        }
    }

    private validateGherkin(content: string): boolean {
        const requiredKeywords = ['Feature:', 'Scenario:', 'Given', 'When', 'Then'];
        // Relaxed validation: check if it contains at least Scenario and some steps
        const hasScenario = content.includes('Scenario:');
        const hasSteps = content.includes('Given') || content.includes('When');

        return hasScenario && hasSteps;
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
