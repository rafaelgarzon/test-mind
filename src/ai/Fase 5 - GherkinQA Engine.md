# Fase 5: GherkinQA Engine — Motor de Calidad para Escenarios Gherkin

Mejora la calidad de los escenarios generados por la IA. Trabaja sobre la rama `feature/phase-4-ai-generation`
(NO crear nueva rama, los cambios se suman a la fase 4 existente).
Al finalizar se debe actualizar el README.md con los cambios de la fase 5.

---

## Contexto del problema

El generador actual (Fase 4) produce escenarios con estos defectos recurrentes:

1. **Nombres genéricos**: Feature y Scenario siempre dicen "Generated Feature" / "Generated Scenario for {input crudo}".
   - Causa: `ScenarioGenerator.ts` líneas 48-50 — fallback básico sin semántica.

2. **Mezcla de idiomas**: El requerimiento llega en español pero los pasos se generan en inglés.
   - Causa: `PromptTemplates.ts` — `GHERKIN_PROMPT_TEMPLATE` es un string estático, sin instrucción de idioma, con ejemplos solo en inglés.

3. **Pasos vagos sin datos concretos**: `When the user performs a hotel search` → sin especificar qué se escribe ni en qué campo.
   - Causa: El prompt no exige valores entre comillas en los pasos `When`.

4. **Assertions sin valor verificable**: `Then the first result should be displayed` → sin texto o elemento específico.
   - Causa: El prompt no exige un valor concreto esperado en los pasos `Then`.

5. **Validación semántica demasiado permisiva**: Si el LLM falla, retorna `true` por defecto.
   - Causa: `ScenarioGenerator.ts` — catch block en `validateGherkinSemantic()` hace `return true`.

---

## Archivos a CREAR (nuevos)

### ARCHIVO 1: `src/ai/core/LanguageDetector.ts`

```typescript
export type SupportedLanguage = 'es' | 'en';

export class LanguageDetector {
    private static readonly spanishPatterns =
        /\b(el|la|los|las|de|en|que|un|una|al|del|se|es|con|por|para|ingresa|realiza|valida|busca|abre|hace|clic|usuario|pagina|sitio|consulta|resultado|primer|primero)\b/gi;

    static detect(text: string): SupportedLanguage {
        const matches = text.match(this.spanishPatterns) ?? [];
        return matches.length >= 3 ? 'es' : 'en';
    }
}
```

---

### ARCHIVO 2: `src/ai/core/GherkinQualityScorer.ts`

```typescript
export interface QualityReport {
    score: number;          // 0 a 100
    passed: boolean;        // true si score >= 70
    issues: string[];       // descripcion de cada problema encontrado
    suggestions: string[];  // como corregir cada problema
}

export class GherkinQualityScorer {

    score(gherkin: string, lang: 'es' | 'en' = 'en'): QualityReport {
        const issues: string[] = [];
        const suggestions: string[] = [];
        let deductions = 0;

        // Regla 1 (peso: -25): Feature name es el fallback generico
        if (/Feature:\s*Generated Feature/i.test(gherkin)) {
            deductions += 25;
            issues.push('Feature name is generic ("Generated Feature")');
            suggestions.push(
                lang === 'es'
                    ? 'Usa un nombre corto que describa la capacidad del negocio, ej: "Búsqueda de Hoteles"'
                    : 'Use a short business capability name, e.g. "Hotel Search"'
            );
        }

        // Regla 2 (peso: -25): Scenario name repite el input crudo
        if (/Scenario:\s*Generated Scenario for/i.test(gherkin)) {
            deductions += 25;
            issues.push('Scenario name contains the raw requirement text');
            suggestions.push(
                lang === 'es'
                    ? 'Describe el comportamiento específico, ej: "Búsqueda exitosa cerca de Hacienda Nápoles"'
                    : 'Describe the specific behavior, e.g. "Successful hotel search near Hacienda Napoles"'
            );
        }

        // Regla 3 (peso: -20): Mezcla de idiomas en escenario español
        if (lang === 'es') {
            const englishStepWords = gherkin.match(
                /\b(the user|clicks|enters|should be|navigates|performs|searches)\b/gi
            ) ?? [];
            if (englishStepWords.length >= 2) {
                deductions += 20;
                issues.push('Language mismatch: English words found in a Spanish-language scenario');
                suggestions.push(
                    'Todos los pasos deben estar en español ya que el requerimiento fue ingresado en español'
                );
            }
        }

        // Regla 4 (peso: -15): Paso Then sin valor especifico verificable
        const thenMatch = gherkin.match(/^\s*Then\s+(.+)/im);
        if (thenMatch) {
            const thenStep = thenMatch[1].trim();
            const isVagueAssertion =
                /should be (displayed|visible|shown|present)$/i.test(thenStep) &&
                !/"[^"]+"/.test(thenStep);
            if (isVagueAssertion) {
                deductions += 15;
                issues.push('Then step lacks a specific verifiable value');
                suggestions.push(
                    lang === 'es'
                        ? 'Agrega el texto esperado entre comillas, ej: Then los resultados deben contener "Hacienda Nápoles"'
                        : 'Add the expected text in quotes, e.g. Then results should contain "Hacienda Napoles"'
                );
            }
        }

        // Regla 5 (peso: -15): Paso When sin datos concretos
        const whenMatch = gherkin.match(/^\s*When\s+(.+)/im);
        if (whenMatch) {
            const whenStep = whenMatch[1].trim();
            const lacksConcreteData = !/"[^"]+"/.test(whenStep);
            const isVagueAction = /performs a|does a|executes|runs a/i.test(whenStep);
            if (lacksConcreteData || isVagueAction) {
                deductions += 15;
                issues.push('When step lacks concrete test data (no quoted values)');
                suggestions.push(
                    lang === 'es'
                        ? 'Especifica qué escribe o en qué hace clic el usuario, ej: When ingresa "hoteles hacienda napoles" en la barra de búsqueda'
                        : 'Specify what the user types or clicks, e.g. When types "hotels near hacienda napoles" in the search bar'
                );
            }
        }

        const finalScore = Math.max(0, 100 - deductions);

        return {
            score: finalScore,
            passed: finalScore >= 70,
            issues,
            suggestions,
        };
    }
}
```

---

## Archivos a MODIFICAR (existentes)

### ARCHIVO 3: `src/ai/PromptTemplates.ts`

Reemplazar el archivo completo con este contenido:

```typescript
// ─────────────────────────────────────────────────────────────────────────────
// FASE 5: GHERKIN_PROMPT_TEMPLATE convertido a función para soportar idioma
// ─────────────────────────────────────────────────────────────────────────────

const SPANISH_GHERKIN_EXAMPLE = `
Requerimiento: "iniciar sesion con credenciales validas"
Feature: Autenticacion de Usuario
  Scenario: Inicio de sesion exitoso
    Given que el usuario esta en "https://example.com/login"
    When ingresa "admin" en el campo de usuario
    And ingresa "Admin1234!" en el campo de contrasena
    And hace clic en el boton "Ingresar"
    Then deberia ver el mensaje "Bienvenido, admin"
    And la URL deberia contener "/dashboard"
`;

const ENGLISH_GHERKIN_EXAMPLE = `
Requirement: "login with valid credentials"
Feature: User Authentication
  Scenario: Successful login with valid credentials
    Given the user is on "https://example.com/login"
    When the user enters "admin" in the username field
    And enters "Admin1234!" in the password field
    And clicks the "Sign In" button
    Then the user should see "Welcome, admin"
    And the URL should contain "/dashboard"
`;

export const buildGherkinPrompt = (requirement: string, lang: 'es' | 'en' = 'en'): string => {
    const langInstruction = lang === 'es'
        ? 'IMPORTANTE: Escribe TODOS los pasos en ESPAÑOL. No mezcles con inglés.'
        : 'Write ALL steps in ENGLISH.';

    const example = lang === 'es' ? SPANISH_GHERKIN_EXAMPLE : ENGLISH_GHERKIN_EXAMPLE;

    return `
You are an expert QA Automation Engineer. Convert the following requirement into a high-quality Gherkin scenario.

${langInstruction}

NAMING RULES:
- Feature: Short business capability name (2-5 words). NEVER use the raw requirement as the name.
  BAD:  Feature: ingresa al sitio google.com y busca hoteles
  GOOD: Feature: Busqueda de Hoteles
- Scenario: Describes the specific behavior being tested. NEVER say "Generated Scenario for...".
  BAD:  Scenario: Generated Scenario for ingresa al sitio...
  GOOD: Scenario: Busqueda exitosa de hoteles cerca de Hacienda Napoles

STEP QUALITY RULES:
- Given: specific URL or concrete precondition with quoted value
- When: action with CONCRETE DATA in double quotes (what the user types, the button text, etc.)
  BAD:  When the user performs a hotel search near Hacienda Napoles
  GOOD: When the user types "hoteles cerca de hacienda napoles" in the search bar
- Then: verifiable assertion with SPECIFIC expected text or element in double quotes
  BAD:  Then the first result of the search should be displayed
  GOOD: Then the search results should contain "Hacienda Napoles" in the first result title
- Use AND for multiple actions of the same type (multiple Whens or multiple Thens)

User Requirement: "${requirement}"

Example:
${example}

Output ONLY the Gherkin scenario. No markdown. No explanations.
`.trim();
};

// ─────────────────────────────────────────────────────────────────────────────
// FASE 5: Nuevo prompt de refinamiento para el bucle de calidad
// ─────────────────────────────────────────────────────────────────────────────

export const buildRefinementPrompt = (
    requirement: string,
    previousGherkin: string,
    suggestions: string[],
    lang: 'es' | 'en'
): string => {
    const langInstruction = lang === 'es'
        ? 'IMPORTANTE: Escribe TODOS los pasos en ESPAÑOL.'
        : 'Write ALL steps in ENGLISH.';

    return `
The Gherkin scenario below has quality issues. Fix ONLY the listed problems and return a corrected version.

${langInstruction}

User Requirement: "${requirement}"

Previous scenario (has issues):
${previousGherkin}

Problems to fix:
${suggestions.map((s, i) => `${i + 1}. ${s}`).join('\n')}

Output ONLY the corrected Gherkin scenario. No markdown. No explanations.
`.trim();
};

// ─────────────────────────────────────────────────────────────────────────────
// Mantener los templates existentes de Fase 4 sin cambios
// ─────────────────────────────────────────────────────────────────────────────

export const STEP_DEFINITION_PROMPT_TEMPLATE = `
You are an expert QA Automation Engineer using CucumberJS, TypeScript, and Serenity/JS (Screenplay Pattern).
Your task is to generate TypeScript step definitions for the following Gherkin scenario.

CRITICAL ARCHITECTURE RULES (SERENITY/JS SCREENPLAY PATTERN):
1. Use 'Given', 'When', 'Then' from '@cucumber/cucumber'.
2. DO NOT use generic browser APIs (like page.locator). YOU MUST strictly use Serenity/JS abstractions: \`actorCalled\`, \`attemptsTo\`, \`Navigate\`, \`Ensure\`, etc.
3. Steps should be written using an Actor. Example: \`await actorCalled('usuario').attemptsTo(...)\`
4. Assume UI elements are defined in \`src/screenplay/ui/UIComponents.ts\` and Tasks in \`src/screenplay/tasks/ActionTasks.ts\`. Do not implement them, just import them hypothetically or use standard ones.
5. Use clear and descriptive function names, strictly typed parameters.
6. Only output the step definition code, no markdown explanations.

Example of expected code style:
\`\`\`typescript
import { Given, When, Then } from '@cucumber/cucumber';
import { actorCalled } from '@serenity-js/core';
import { Navigate, Click, Enter } from '@serenity-js/web';
import { Ensure, includes } from '@serenity-js/assertions';
import { LoginUI } from '../../src/screenplay/ui/LoginUI';

Given('que el Actor {string} abre la pagina', async (actorName: string) => {
    await actorCalled(actorName).attemptsTo(
        Navigate.to('https://example.com')
    );
});
\`\`\`

Gherkin Scenario:
"{scenario}"

Output ONLY the TypeScript code for the step definitions.
`;

export const SCENARIO_VALIDATION_PROMPT_TEMPLATE = `
You are an expert QA Automation Engineer acting as a validator.
Your task is to determine if the generated Gherkin scenario correctly and fully addresses the given user requirement.

User Requirement: "{requirement}"

Generated Gherkin Scenario:
"""
{scenario}
"""

Evaluate the scenario based on:
1. Is it generally related to the user requirement?
2. Does it have the basic logical steps for it?

If the scenario broadly implements the requirement, respond with EXACTLY the word: VALID. Do NOT be overly strict about missing edge cases, email confirmations, or implicit steps not mentioned by the user.
If it completely misses the core requirement, respond with EXACTLY the word: INVALID followed by why it failed.
Output ONLY 'VALID' or 'INVALID: reason'.
`;

export const LEARNING_FEEDBACK_PROMPT_TEMPLATE = `
You are an expert QA Automation Engineer.
The following Gherkin scenario was generated previously for a requirement, but its execution failed.
Your task is to analyze the failure and generate a corrected, improved Gherkin scenario.

User Requirement: "{requirement}"

Original Failed Scenario:
"""
{scenario}
"""

Execution Error/Feedback:
"""
{error}
"""

Fix the scenario so it addresses the error and correctly implements the requirement.
Output ONLY the corrected Gherkin scenario.
`;

// Alias de compatibilidad para no romper imports existentes en ScenarioGenerator (Fase 4).
// Se elimina en la proxima limpieza de deuda tecnica.
export const GHERKIN_PROMPT_TEMPLATE = buildGherkinPrompt('{requirement}', 'en');
```

---

### ARCHIVO 4: `src/ai/ScenarioGenerator.ts`

Reemplazar el archivo completo con este contenido:

```typescript
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
            'el','la','los','las','de','en','que','un','una','al','del','con',
            'por','para','se','es','the','a','an','of','in','on','to','and','or',
            'for','with','at','from','ingresa','realiza','valida','sitio','pagina',
        ]);

        const meaningful = requirement
            .toLowerCase()
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
```

---

### ARCHIVO 5: `src/ui/server.ts`

Actualizar los endpoints para exponer el `quality` report en la respuesta.
Reemplazar el archivo completo con este contenido:

```typescript
import express from 'express';
import cors from 'cors';
import path from 'path';
import { ScenarioGenerator } from '../ai/ScenarioGenerator';
import { OllamaProvider } from '../ai/OllamaProvider';

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const generator = new ScenarioGenerator();
const provider = new OllamaProvider();

generator.initialize().catch(console.error);

app.get('/api/status', async (req, res) => {
    try {
        const isHealthy = await provider.isHealthy();
        res.json({ status: isHealthy ? 'online' : 'offline' });
    } catch (e) {
        res.json({ status: 'error', error: String(e) });
    }
});

// FASE 5: /api/generate ahora retorna { success, gherkin, quality: { score, passed, issues } }
app.post('/api/generate', async (req, res) => {
    const { requirement } = req.body;
    if (!requirement) {
        return res.status(400).json({ error: 'Requirement is required' });
    }

    try {
        const result = await generator.generateScenario(requirement);
        if (result) {
            res.json({
                success: true,
                gherkin: result.gherkin,
                quality: {
                    score: result.quality.score,
                    passed: result.quality.passed,
                    issues: result.quality.issues,
                },
            });
        } else {
            res.status(500).json({ error: 'Failed to generate scenario or validation failed' });
        }
    } catch (e) {
        res.status(500).json({ error: String(e) });
    }
});

app.post('/api/generate-steps', async (req, res) => {
    const { gherkin } = req.body;
    if (!gherkin) {
        return res.status(400).json({ error: 'Gherkin is required' });
    }

    try {
        const steps = await generator.generateStepDefinitions(gherkin);
        res.json({ success: true, steps });
    } catch (e) {
        res.status(500).json({ error: String(e) });
    }
});

app.listen(port, () => {
    console.log(`🚀 UI Web server running at http://localhost:${port}`);
});
```

---

### ARCHIVO 6: `src/ui/public/index.html`

Reemplazar el archivo completo con este contenido (agrega el quality badge y actualiza el titulo a Fase 5):

```html
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>AI Test Generator (Fase 5)</title>
    <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; background-color: #f5f5f5; }
        h1 { color: #333; }
        .card { background: white; padding: 20px; border-radius: 8px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); margin-bottom: 20px; }
        textarea { width: 100%; padding: 10px; border: 1px solid #ccc; border-radius: 4px; box-sizing: border-box; resize: vertical; margin-bottom: 10px; font-family: monospace; }
        button { background-color: #0066cc; color: white; border: none; padding: 10px 20px; border-radius: 4px; cursor: pointer; font-size: 16px; }
        button:hover { background-color: #0052a3; }
        button:disabled { background-color: #cccccc; cursor: not-allowed; }
        pre { background: #2d2d2d; color: #f8f8f2; padding: 15px; border-radius: 4px; overflow-x: auto; white-space: pre-wrap; }
        .status { margin-bottom: 20px; font-weight: bold; }
        .online { color: green; }
        .offline { color: red; }

        /* FASE 5: Quality badge styles */
        .quality-bar { display: flex; align-items: center; gap: 12px; margin-bottom: 12px; padding: 10px 14px; border-radius: 6px; background: #f8f9fa; border: 1px solid #e9ecef; }
        .quality-score-badge { font-size: 1.1em; font-weight: 700; padding: 4px 10px; border-radius: 20px; color: white; }
        .badge-pass { background-color: #28a745; }
        .badge-warn { background-color: #fd7e14; }
        .badge-fail { background-color: #dc3545; }
        .quality-issues { margin: 8px 0 0 0; padding: 0 0 0 18px; font-size: 0.83em; color: #c0392b; }
        .quality-issues li { margin-bottom: 3px; }
    </style>
</head>
<body>
    <h1>🤖 Generador de Pruebas AI (Fase 5)</h1>

    <div class="card">
        <div class="status">Estado de IA (Ollama): <span id="status-indicator">Verificando...</span></div>
        <p>Ingresa un requerimiento o historia de usuario en lenguaje natural:</p>
        <textarea id="requirement" rows="4" placeholder="Ej: ingresa al sitio google.com, busca hoteles cerca de la hacienda napoles y valida el primer resultado"></textarea>
        <button id="generate-btn">Generar Escenario (Gherkin)</button>
    </div>

    <div id="result-container" class="card" style="display: none;">
        <h3>Resultado Gherkin</h3>

        <!-- FASE 5: Quality badge -->
        <div class="quality-bar" id="quality-bar">
            <span>Calidad:</span>
            <span class="quality-score-badge" id="quality-badge">—</span>
            <span id="quality-label"></span>
        </div>
        <ul class="quality-issues" id="quality-issues" style="display:none;"></ul>

        <pre id="gherkin-result"></pre>
        <button id="generate-steps-btn">Generar Step Definitions</button>
    </div>

    <div id="steps-container" class="card" style="display: none;">
        <h3>Step Definitions (TypeScript)</h3>
        <pre id="steps-result"></pre>
    </div>

    <script>
        document.addEventListener('DOMContentLoaded', () => {
            const statusInd     = document.getElementById('status-indicator');
            const reqInput      = document.getElementById('requirement');
            const genBtn        = document.getElementById('generate-btn');
            const resultDiv     = document.getElementById('result-container');
            const gherkinPre    = document.getElementById('gherkin-result');
            const genStepsBtn   = document.getElementById('generate-steps-btn');
            const stepsDiv      = document.getElementById('steps-container');
            const stepsPre      = document.getElementById('steps-result');
            const qualityBadge  = document.getElementById('quality-badge');
            const qualityLabel  = document.getElementById('quality-label');
            const qualityIssues = document.getElementById('quality-issues');

            fetch('/api/status')
                .then(r => r.json())
                .then(data => {
                    if (data.status === 'online') {
                        statusInd.textContent = '🟢 En línea';
                        statusInd.className = 'online';
                    } else {
                        statusInd.textContent = '🔴 Fuera de línea';
                        statusInd.className = 'offline';
                    }
                }).catch(() => {
                    statusInd.textContent = '🔴 Error de conexión';
                    statusInd.className = 'offline';
                });

            let currentGherkin = '';

            genBtn.addEventListener('click', async () => {
                const requirement = reqInput.value.trim();
                if (!requirement) return alert('Ingresa un requerimiento');

                genBtn.disabled = true;
                genBtn.textContent = 'Generando...';
                resultDiv.style.display = 'none';
                stepsDiv.style.display = 'none';

                try {
                    const res = await fetch('/api/generate', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ requirement })
                    });
                    const data = await res.json();

                    if (data.success) {
                        currentGherkin = data.gherkin;
                        gherkinPre.textContent = data.gherkin;

                        // FASE 5: Renderizar quality badge
                        const q = data.quality;
                        if (q) {
                            qualityBadge.textContent = `${q.score}/100`;
                            qualityBadge.className = 'quality-score-badge ' +
                                (q.score >= 70 ? 'badge-pass' : q.score >= 50 ? 'badge-warn' : 'badge-fail');
                            qualityLabel.textContent = q.passed ? '✅ Aprobado' : '⚠️ Con observaciones';

                            if (q.issues && q.issues.length > 0) {
                                qualityIssues.innerHTML = q.issues.map(i => `<li>${i}</li>`).join('');
                                qualityIssues.style.display = 'block';
                            } else {
                                qualityIssues.innerHTML = '';
                                qualityIssues.style.display = 'none';
                            }
                        }

                        resultDiv.style.display = 'block';
                    } else {
                        alert('Error: ' + data.error);
                    }
                } catch (e) {
                    alert('Error en la petición: ' + e);
                } finally {
                    genBtn.disabled = false;
                    genBtn.textContent = 'Generar Escenario (Gherkin)';
                }
            });

            genStepsBtn.addEventListener('click', async () => {
                if (!currentGherkin) return;

                genStepsBtn.disabled = true;
                genStepsBtn.textContent = 'Generando Steps...';

                try {
                    const res = await fetch('/api/generate-steps', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ gherkin: currentGherkin })
                    });
                    const data = await res.json();

                    if (data.success) {
                        stepsPre.textContent = data.steps;
                        stepsDiv.style.display = 'block';
                    } else {
                        alert('Error: ' + data.error);
                    }
                } catch (e) {
                    alert('Error en la petición: ' + e);
                } finally {
                    genStepsBtn.disabled = false;
                    genStepsBtn.textContent = 'Generar Step Definitions';
                }
            });
        });
    </script>
</body>
</html>
```

---

## Orden de implementacion recomendado

1. Crear `src/ai/core/LanguageDetector.ts`
2. Crear `src/ai/core/GherkinQualityScorer.ts`
3. Reemplazar `src/ai/PromptTemplates.ts`
4. Reemplazar `src/ai/ScenarioGenerator.ts`
5. Reemplazar `src/ui/server.ts`
6. Reemplazar `src/ui/public/index.html`
7. Verificar que compila: `npx tsc --noEmit`
8. Probar el servidor: `npm run ai:web`
9. Actualizar `README.md` — agregar seccion "Fase 5: GherkinQA Engine"

---

## Resultado esperado tras la implementacion

Input de ejemplo:
```
ingresa al sitio de google.com , realiza una consulta de hoteles cercanos a la hacienda napoles y valida cual es el primer resultado de la busqueda
```

Antes (Fase 4):
```
Feature: Generated Feature
Scenario: Generated Scenario for ingresa al sitio de google.com...
  Given the user is on the google.com website
  When the user performs a hotel search near Hacienda Napoles
  Then the first result of the search should be displayed
```

Despues (Fase 5, score esperado >= 75/100):
```
Feature: Busqueda Hoteles Google
  Scenario: Busqueda exitosa de hoteles cerca de Hacienda Napoles
    Given que el usuario esta en "https://google.com"
    When ingresa "hoteles cerca de hacienda napoles" en la barra de busqueda
    And hace clic en el boton "Buscar"
    Then los resultados deben contener "Hacienda Napoles" en el titulo del primer resultado
```
