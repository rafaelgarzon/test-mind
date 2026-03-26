import { OllamaProvider } from './OllamaProvider';
import { KnowledgeBase } from '../db/KnowledgeBase';
import {
    SYSTEM_ROLE_GHERKIN,
    DOMAIN_KNOWLEDGE_GHERKIN,
    buildRefinementSystemPrompt,
    SCENARIO_VALIDATION_SYSTEM_PROMPT,
    LEARNING_FEEDBACK_SYSTEM_PROMPT,
    STEP_DEFINITION_SYSTEM_PROMPT,
} from './PromptTemplates';
import { LanguageDetector } from './core/LanguageDetector';
import { GherkinQualityScorer, QualityReport } from './core/GherkinQualityScorer';
import { ContextBuilder } from './infrastructure/ContextBuilder';

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
        maxAttempts: number = 3,
        businessFeedback?: string
    ): Promise<{ gherkin: string; quality: QualityReport } | null> {

        console.log(`Generating scenario for: "${userRequirement}"`);

        const lang = LanguageDetector.detect(userRequirement);
        const scorer = new GherkinQualityScorer();

        // ── Deduplicación semántica: reutilizar escenario si Jaccard ≥ 0.5 ─────
        const similar = await this.kb.findSimilar(userRequirement, 0.5);
        if (similar.length > 0) {
            const best = similar[0];
            const pct = (best.similarity * 100).toFixed(0);
            console.log(`♻️  Reutilizando escenario existente [ID ${best.id}] (similitud: ${pct}%) — "${best.description}"`);
            const report = scorer.score(best.gherkin_content, lang);
            return {
                gherkin: best.gherkin_content,
                quality: {
                    ...report,
                    issues: [
                        `♻️ Escenario reutilizado de la base de conocimiento (similitud ${pct}%) — "${best.description}"`,
                        ...report.issues,
                    ],
                },
            };
        }

        // Fallback: búsqueda LIKE textual (loggear pero no bloquear)
        const existing = await this.kb.searchScenarios(userRequirement);
        if (existing.length > 0) {
            console.log('Escenarios relacionados en KB (similitud Jaccard < 50%, no reutilizados):');
            existing.forEach(s => console.log(`  - [ID ${s.id}] ${s.description}`));
        }

        let bestGherkin: string | null = null;
        let bestReport: QualityReport = { score: 0, passed: false, issues: [], suggestions: [] };

        for (let attempt = 1; attempt <= maxAttempts; attempt++) {
            console.log(`🔄 Attempt ${attempt}/${maxAttempts} (lang: ${lang})`);

            const builder = new ContextBuilder();

            if (attempt === 1) {
                // Initial generation: System rules + Domain Knowledge (Examples) + User Requirement
                builder.addSystemPrompt(SYSTEM_ROLE_GHERKIN(lang));
                builder.addDomainKnowledge(DOMAIN_KNOWLEDGE_GHERKIN(lang));

                // If we found a similar scenario in KB, inject it as Memory File
                if (similar.length > 0) {
                    builder.addMemoryFile(`Requirement: "${similar[0].description}"\nScenario:\n${similar[0].gherkin_content}`);
                }

                if (businessFeedback) {
                    console.log(`\n[ScenarioGenerator] 🧠 Inyectando feedback previo de alineación de negocio...`);
                    builder.addUserMessage(`Requirement: "${userRequirement}"\n\nATENCIÓN - UN AUDITOR DENEGÓ UN INTENTO PREVIO TUYO CON ESTA RAZÓN:\n"${businessFeedback}"\n\nPor favor, reescribe este Gherkin acatando inquebrantablemente dicha regla corporativa.`);
                } else {
                    builder.addUserMessage(`User Requirement: "${userRequirement}"`);
                }

            } else {
                // Refinement: System instructions for fixing + User Requirement + Previous Output + Required Changes
                builder.addSystemPrompt(buildRefinementSystemPrompt(bestReport.suggestions, lang));
                builder.addUserMessage(`User Requirement: "${userRequirement}"`);
                builder.addAssistantMessage(bestGherkin!);
                builder.addUserMessage('Please fix the issues previously identified.');
            }

            try {
                // Use the Context Engineering message array
                const rawResponse = await this.ollama.generateChat(builder.build());
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

        // Fase 7: La validación semántica es no-bloqueante — si falla, se agrega
        // como advertencia en el quality report pero NO bloquea la generación.
        // Esto permite que el usuario vea el Gherkin generado y lo valide
        // usando el preview real (ejecución en navegador) antes de implementar.
        const isSemanticallyValid = await this.validateGherkinSemantic(userRequirement, bestGherkin);
        if (!isSemanticallyValid) {
            console.warn('⚠️  Semantic validation returned INVALID — continuing with generated Gherkin (non-blocking).');
            bestReport = {
                ...bestReport,
                issues: [...bestReport.issues, '⚠️ La validación semántica automática tuvo dudas sobre la relevancia. Verifica con Vista Previa.'],
            };
            // No guardamos en KB si la validación semántica falla para evitar contaminar futuras búsquedas
        } else {
            await this.kb.addScenario(userRequirement, bestGherkin);
        }

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

        const builder = new ContextBuilder()
            .addSystemPrompt(SCENARIO_VALIDATION_SYSTEM_PROMPT)
            .addUserMessage(`User Requirement: "${requirement}"\n\nGenerated Gherkin Scenario:\n"""\n${gherkin}\n"""`);

        try {
            const validationResult = await this.ollama.generateChat(builder.build());
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

            const builder = new ContextBuilder()
                .addSystemPrompt(LEARNING_FEEDBACK_SYSTEM_PROMPT)
                .addUserMessage(`User Requirement: "${target.description}"\n\nOriginal Failed Scenario:\n"""\n${target.gherkin_content}\n"""\n\nExecution Error/Feedback:\n"""\n${target.execution_error || 'Unknown execution error.'}\n"""`);

            const improvedGherkin = await this.ollama.generateChat(builder.build());

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

        const { STEP_DEFINITION_SYSTEM_PROMPT } = await import('./PromptTemplates');

        const builder = new ContextBuilder()
            .addSystemPrompt(STEP_DEFINITION_SYSTEM_PROMPT)
            .addUserMessage(`Gherkin Scenario:\n"${gherkinScenario}"`);

        try {
            const steps = await this.ollama.generateChat(builder.build());
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
