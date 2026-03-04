/**
 * src/ai/prompts/GherkinToPlaywrightPrompt.ts — Fase 7
 *
 * Prompt few-shot que instruye al LLM a traducir pasos Gherkin
 * en acciones de Playwright MCP (JSON array).
 */
import { ParsedGherkinStep } from '../core/GherkinStepParser';

export interface TranslatedPlaywrightAction {
    stepIndex: number;
    stepText: string;
    toolName: string;
    toolArgs: Record<string, unknown>;
}

/** Herramientas disponibles en @playwright/mcp */
export const PLAYWRIGHT_MCP_TOOLS = [
    'browser_navigate',
    'browser_click',
    'browser_type',
    'browser_select_option',
    'browser_press_key',
    'browser_hover',
    'browser_wait_for',
    'browser_take_screenshot',
    'browser_snapshot',
    'browser_check',
    'browser_uncheck',
] as const;

export type PlaywrightMcpTool = typeof PLAYWRIGHT_MCP_TOOLS[number];

const SYSTEM_PROMPT = `You are a Playwright automation expert.
Your task: convert each Gherkin step into a Playwright MCP tool call.

Available tools and their args:
- browser_navigate:     { url: string }
- browser_click:        { element: string, ref?: string }
- browser_type:         { element: string, text: string }
- browser_select_option:{ element: string, values: string[] }
- browser_press_key:    { key: string }
- browser_hover:        { element: string, ref?: string }
- browser_wait_for:     { text: string, timeout?: number }
- browser_take_screenshot: {}
- browser_snapshot:     {}
- browser_check:        { element: string }
- browser_uncheck:      { element: string }

Rules:
1. Given steps with a URL (starting with http) → browser_navigate
2. When steps with "click", "press", "tap" → browser_click (element = quoted text or button label)
3. When steps with "type", "enter", "fill", "input", "write", "ingresa" → browser_type
4. When steps with "select", "choose" → browser_select_option
5. Then steps → browser_wait_for (text = the expected visible string, taken from quotes if present)
6. If no quoted values exist, use the full step text as the element/text descriptor
7. Preserve quoted strings verbatim — they usually match button labels or input placeholders exactly

IMPORTANT: Return ONLY a valid JSON array. No markdown fences. No explanation. No extra text.`;

const FEW_SHOT_EXAMPLE = `Example input:
[
  { "keyword": "Given", "text": "the user is on \\"https://the-internet.herokuapp.com/login\\"" },
  { "keyword": "When",  "text": "enters \\"tomsmith\\" in the username field" },
  { "keyword": "When",  "text": "enters \\"SuperSecretPassword!\\" in the password field" },
  { "keyword": "When",  "text": "clicks the \\"Login\\" button" },
  { "keyword": "Then",  "text": "should see the message \\"You logged into a secure area!\\"" }
]

Example output:
[
  { "stepIndex": 0, "stepText": "the user is on \\"https://the-internet.herokuapp.com/login\\"", "toolName": "browser_navigate", "toolArgs": { "url": "https://the-internet.herokuapp.com/login" } },
  { "stepIndex": 1, "stepText": "enters \\"tomsmith\\" in the username field", "toolName": "browser_type", "toolArgs": { "element": "username field", "text": "tomsmith" } },
  { "stepIndex": 2, "stepText": "enters \\"SuperSecretPassword!\\" in the password field", "toolName": "browser_type", "toolArgs": { "element": "password field", "text": "SuperSecretPassword!" } },
  { "stepIndex": 3, "stepText": "clicks the \\"Login\\" button", "toolName": "browser_click", "toolArgs": { "element": "Login button" } },
  { "stepIndex": 4, "stepText": "should see the message \\"You logged into a secure area!\\"", "toolName": "browser_wait_for", "toolArgs": { "text": "You logged into a secure area!" } }
]`;

export function buildGherkinToPlaywrightPrompt(steps: ParsedGherkinStep[]): {
    system: string;
    user: string;
} {
    const stepsJson = JSON.stringify(
        steps.map(s => ({ keyword: s.keyword, text: s.text })),
        null,
        2
    );

    const user = `${FEW_SHOT_EXAMPLE}

Now convert these steps:
${stepsJson}`;

    return { system: SYSTEM_PROMPT, user };
}

/**
 * Fallback heurístico cuando el LLM produce JSON inválido.
 * Traduce un step usando reglas regex simples.
 */
export function heuristicTranslate(step: ParsedGherkinStep): TranslatedPlaywrightAction {
    const text = step.text.toLowerCase();
    const quoted = step.text.match(/"([^"]+)"/g)?.map(s => s.replace(/"/g, '')) ?? [];

    // URL directa
    const urlMatch = step.text.match(/https?:\/\/[^\s"]+/);
    if (urlMatch) {
        return {
            stepIndex: step.index, stepText: step.text,
            toolName: 'browser_navigate',
            toolArgs: { url: urlMatch[0] },
        };
    }

    // Quoted URL
    if (quoted[0]?.startsWith('http')) {
        return {
            stepIndex: step.index, stepText: step.text,
            toolName: 'browser_navigate',
            toolArgs: { url: quoted[0] },
        };
    }

    // Click
    if (/click|press|tap|haz clic|pulsa|da clic/.test(text)) {
        return {
            stepIndex: step.index, stepText: step.text,
            toolName: 'browser_click',
            toolArgs: { element: quoted[0] ?? step.text },
        };
    }

    // Type / input
    if (/type|enter|fill|input|write|ingresa|escribe|introduce/.test(text) && quoted.length >= 1) {
        const element = quoted.length >= 2 ? quoted[0] : (text.replace(/ingresa|escribe|introduce|type|enter|fill|input|write/, '').trim() || 'input field');
        const inputText = quoted.length >= 2 ? quoted[1] : quoted[0];
        return {
            stepIndex: step.index, stepText: step.text,
            toolName: 'browser_type',
            toolArgs: { element, text: inputText },
        };
    }

    // Select
    if (/select|choose|selecciona|elige/.test(text)) {
        return {
            stepIndex: step.index, stepText: step.text,
            toolName: 'browser_select_option',
            toolArgs: { element: quoted[0] ?? 'select', values: [quoted[1] ?? ''] },
        };
    }

    // Then → wait for visible text
    if (step.keyword === 'Then') {
        return {
            stepIndex: step.index, stepText: step.text,
            toolName: 'browser_wait_for',
            toolArgs: { text: quoted[0] ?? step.text },
        };
    }

    // Fallback seguro
    return {
        stepIndex: step.index, stepText: step.text,
        toolName: 'browser_snapshot',
        toolArgs: {},
    };
}

/**
 * Parsea la respuesta del LLM y retorna acciones validadas.
 * Si el JSON falla, usa el fallback heurístico para cada step.
 */
export function parseTranslationResponse(
    rawResponse: string,
    originalSteps: ParsedGherkinStep[]
): TranslatedPlaywrightAction[] {
    // Strip markdown fences
    const clean = rawResponse
        .replace(/```json\s*/gi, '')
        .replace(/```\s*/g, '')
        .trim();

    try {
        const parsed = JSON.parse(clean) as TranslatedPlaywrightAction[];
        if (!Array.isArray(parsed) || parsed.length === 0) throw new Error('Not an array');

        // Validar que cada toolName sea conocido, corregir si no
        return parsed.map((action, i) => {
            const tool = action.toolName as PlaywrightMcpTool;
            if (!PLAYWRIGHT_MCP_TOOLS.includes(tool)) {
                console.warn(`[GherkinToPlaywright] Tool desconocido "${tool}", usando heurístico para step ${i}`);
                return heuristicTranslate(originalSteps[action.stepIndex] ?? originalSteps[i]);
            }
            return action;
        });
    } catch {
        console.warn('[GherkinToPlaywright] JSON inválido del LLM, usando fallback heurístico para todos los steps');
        return originalSteps.map(heuristicTranslate);
    }
}
