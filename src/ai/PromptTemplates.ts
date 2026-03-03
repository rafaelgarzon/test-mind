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

// Alias eliminado en Fase 6 (M-04). Usar buildGherkinPrompt(requirement, lang).
