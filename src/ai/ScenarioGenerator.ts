import { OllamaProvider } from './OllamaProvider';
import { KnowledgeBase } from '../db/KnowledgeBase';
import {
    buildGherkinPrompt,
    buildRefinementPrompt,
    SCENARIO_VALIDATION_PROMPT_TEMPLATE,
    LEARNING_FEEDBACK_PROMPT_TEMPLATE,
} from './PromptTemplates';
import { LanguageDetector } from './core/LanguageDetector';
import { GherkinQualityScorer, QualityReport } from './core/GherkinQualityScorer';

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
            throw new Error('Ollama connection failed');
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // FASE 5: generateScenario con bucle de calidad (máximo 3 intentos)
    // ─────────────────────────────────────────────────────────────────────────
    async generateScenario(
        userRequirement: string,
        maxAttempts: number = 3
    ): Promise<{ gherkin: string; quality: QualityReport } | null> {

        console.log(`Generating scenario for: "${userRequirement}"`);

        const lang = LanguageDetector.detect(userRequirement);
        const scorer = new GherkinQualityScorer();

        // Check KB for similar scenarios
        const existing = await this.kb.searchScenarios(userRequirement);
        if (existing.length > 0) {
            console.log('Similar scenarios found in Knowledge Base:');
            existing.forEach(s => console.log(`  - [ID ${s.id}] ${s.description}`));
        }

        let bestGherkin: string | null = null;
        let bestReport: QualityReport = { score: 0, passed: false, issues: [], suggestions: [] };

        for (let attempt = 1; attempt <= maxAttempts; attempt++) {
            console.log(`🔄 Attempt ${attempt}/${maxAttempts} (lang: ${lang})`);

            const prompt = attempt === 1
                ? buildGherkinPrompt(userRequirement, lang)
                : buildRefinementPrompt(userRequirement, bestGherkin!, bestReport.suggestions, lang);

            try {
                const rawResponse = await this.ollama.generateCompletion(prompt);
                let finalGherkin = rawResponse.trim();

                // FASE 5: Fallback mejorado — extrae nombre semántico en vez de "Generated Feature"
                if (!finalGherkin.includes('Feature:')) {
                    const featureName = this.buildFeatureName(userRequirement, lang);
                    const scenarioName = this.buildScenarioName(userRequirement, lang);
                    finalGherkin = `Feature: ${featureName}\n  Scenario: ${scenarioName}\n${finalGherkin}`;
                } else if (!finalGherkin.includes('Scenario:')) {
                    const scenarioName = this.buildScenarioName(userRequirement, lang);
                    finalGherkin = finalGherkin.replace(
                        /Feature:(.+)/,
                        `Feature:$1\n  Scenario: ${scenarioName}`
                    );
                }

                const report = scorer.score(finalGherkin, lang);
                console.log(`📊 Quality: ${report.score}/100 — ${report.passed ? '✅ PASS' : '❌ FAIL'}`);
                if (report.issues.length > 0) {
                    report.issues.forEach(i => console.log(`   ⚠ ${i}`));
                }

                if (report.score > bestReport.score) {
                    bestReport = report;
                    bestGherkin = finalGherkin;
                }

                if (report.passed) break;

            } catch (error) {
                console.error(`Error on attempt ${attempt}:`, error);
            }
        }

        if (!bestGherkin) {
            console.error('All generation attempts failed.');
            return null;
        }

        if (!this.validateGherkinSyntax(bestGherkin)) {
            console.error('Generated Gherkin is syntactically invalid.');
            return null;
        }

        const isSemanticallyValid = await this.validateGherkinSemantic(userRequirement, bestGherkin);
        if (!isSemanticallyValid) {
            console.error('Generated Gherkin is semantically invalid for the requirement.');
            return null;
        }

        await this.kb.addScenario(userRequirement, bestGherkin);
        return { gherkin: bestGherkin, quality: bestReport };
    }

    async generateScenariosBatch(requirements: string[]): Promise<({ gherkin: string; quality: QualityReport } | null)[]> {
        console.log(`\n📦 Starting batch processing for ${requirements.length} requirements...`);
        const results = [];

        for (let i = 0; i < requirements.length; i++) {
            console.log(`\n⏳ Processing requirement ${i + 1}/${requirements.length}`);
            const result = await this.generateScenario(requirements[i]);
            results.push(result);
        }

        console.log(`\n✅ Finished batch processing.`);
        return results;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // FASE 5: Helpers para generar nombres semanticos en el fallback
    // ─────────────────────────────────────────────────────────────────────────

    private buildFeatureName(requirement: string, lang: 'es' | 'en'): string {
        const stopWords = new Set([
            'el', 'la', 'los', 'las', 'de', 'en', 'que', 'un', 'una', 'al', 'del', 'con',
            'por', 'para', 'se', 'es', 'the', 'a', 'an', 'of', 'in', 'on', 'to', 'and', 'or',
            'for', 'with', 'at', 'from', 'ingresa', 'realiza', 'valida', 'sitio', 'pagina',
        ]);

        const meaningful = requirement
            .toLowerCase()
            .replace(/[.,\-_]/g, ' ')
            .replace(/[^a-záéíóúña-z0-9\s]/gi, '')
            .split(/\s+/)
            .filter(w => w.length > 3 && !stopWords.has(w))
            .slice(0, 3)
            .map(w => w.charAt(0).toUpperCase() + w.slice(1));

        return meaningful.length > 0 ? meaningful.join(' ') : (lang === 'es' ? 'Flujo de Usuario' : 'User Flow');
    }

    private buildScenarioName(requirement: string, lang: 'es' | 'en'): string {
        const cleaned = requirement
            .replace(/^(ingresa|accede|abre|navega|verifica|valida|realiza)\s+/i, '')
            .trim();

        const prefix = lang === 'es' ? 'Flujo exitoso: ' : 'Successful flow: ';
        const shortened = cleaned.length > 60 ? cleaned.substring(0, 57) + '...' : cleaned;
        return prefix + shortened.charAt(0).toUpperCase() + shortened.slice(1);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Validaciones existentes (sin cambios de Fase 4)
    // ─────────────────────────────────────────────────────────────────────────

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
            return true; // Default permissive — sin cambio intencional
        }
    }

    async improveFailedScenario(scenarioId: number): Promise<string | null> {
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

            await this.kb.addScenario(`${target.description} (Improved from ID ${scenarioId})`, improvedGherkin);
            console.log(`✅ Learning cycle complete.`);

            return improvedGherkin;
        } catch (error) {
            console.error('Error during learning cycle:', error);
            return null;
        }
    }

    async generateStepDefinitions(gherkinScenario: string): Promise<string | null> {
        console.log('Generating step definitions...');
        const { STEP_DEFINITION_PROMPT_TEMPLATE } = await import('./PromptTemplates');
        const prompt = STEP_DEFINITION_PROMPT_TEMPLATE.replace('{scenario}', gherkinScenario);

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
