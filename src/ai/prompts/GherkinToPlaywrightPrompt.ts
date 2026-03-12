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

    // Extraer strings entre comillas dobles O simples (el LLM puede generar ambos)
    const quoted = [
        ...(step.text.match(/"([^"]+)"/g)?.map(s => s.slice(1, -1)) ?? []),
        ...(step.text.match(/'([^']+)'/g)?.map(s => s.slice(1, -1)) ?? []),
    ].filter((v, i, arr) => arr.indexOf(v) === i);  // dedup

    // URL directa
    const urlMatch = step.text.match(/https?:\/\/[^\s"']+/);
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

    // Press key (Enter, Tab, Escape, etc.) — before click to avoid conflict with "press Enter"
    if (/press\s+(key\s+)?(enter|return|tab|escape|esc|space|intro|retorno)/i.test(text)) {
        const keyMatch = text.match(/press\s+(?:key\s+)?(enter|return|tab|escape|esc|space|intro|retorno)/i);
        const keyMap: Record<string, string> = { enter: 'Enter', return: 'Enter', intro: 'Enter', retorno: 'Enter', tab: 'Tab', escape: 'Escape', esc: 'Escape', space: 'Space' };
        const raw = (keyMatch?.[1] ?? 'enter').toLowerCase();
        return {
            stepIndex: step.index, stepText: step.text,
            toolName: 'browser_press_key',
            toolArgs: { key: keyMap[raw] ?? 'Enter' },
        };
    }

    // Click
    if (/click|press|tap|haz clic|pulsa|da clic/.test(text)) {
        // Extract element from: "clicks the 'X' button" or "clicks 'X'"
        // or contextual: "clicks the login button" → "login button"
        let elementDesc: string;
        if (quoted.length > 0) {
            elementDesc = quoted[0];
        } else {
            // Remove action keywords and articles to get element name
            elementDesc = step.text
                .replace(/^(the user|user|el usuario|usuario)\s+/i, '')
                .replace(/^(click|clicks|press|presses|tap|taps|haz clic en|pulsa|da clic en)\s+(the|el|la|los|las|on the|en el|en la)?\s*/i, '')
                .trim() || step.text;
        }
        return {
            stepIndex: step.index, stepText: step.text,
            toolName: 'browser_click',
            toolArgs: { element: elementDesc },
        };
    }

    // Type / input — patterns:
    // 1. types "value" in the "field name" → element=field name, text=value
    // 2. types "value" in the field name   → element=field name, text=value (field unquoted)
    // 3. enters "field name" with "value"  → element=field name, text=value
    // 4. searches for "value"              → element=search box, text=value, submit=true
    if (/type|enter|fill|input|write|ingresa|escribe|introduce|busca|search/.test(text) && quoted.length >= 1) {
        let element: string;
        let inputText: string;

        // ¿Es una búsqueda? → submit=true para enviar el formulario al terminar
        const isSearch = /busca|search\s+for|search\s+by|realiza\s+(una\s+)?b[uú]squeda/i.test(text);

        if (quoted.length >= 2) {
            // Both field and value are quoted — determine order
            // "type 'value' in 'field'" or "enter 'field' with 'value'"
            const afterFirstQuote = step.text.substring(
                step.text.search(/["']/) + quoted[0].length + 2
            );
            if (/\bin\b|\ben\b/i.test(afterFirstQuote)) {
                // "type 'value' in 'field'" → quoted[0]=value, quoted[1]=field
                inputText = quoted[0];
                element = quoted[1];
            } else {
                // "enter 'field' with 'value'" → quoted[0]=field, quoted[1]=value
                element = quoted[0];
                inputText = quoted[1];
            }
        } else {
            // Single quote: extract value and infer field from surrounding text
            inputText = quoted[0];

            if (isSearch) {
                // Descriptor multi-idioma para que findRefInSnapshot encuentre el campo
                // de búsqueda tanto en sitios en español ("Buscar") como en inglés ("Search").
                // El fallback en findRefInSnapshot usará el primer textbox/combobox si no hay match.
                element = 'search buscar búsqueda';
            } else {
                // Try to find field name after "in the ..." or "en el/la ..."
                const inFieldMatch = step.text.match(/\bin\s+(?:the|a|el|la|los|las)?\s+([^"']+?)(?:\s+field|\s+input|\s+box|\s+campo)?\s*$/i);
                if (inFieldMatch) {
                    element = inFieldMatch[1].trim().replace(/^(the|a|el|la)\s+/i, '').trim();
                } else {
                    // Fallback: remove action verb + quoted text to find field name
                    element = step.text
                        .replace(/["'][^"']*["']/g, '')
                        .replace(/^(the user|user|el usuario|usuario)\s+/i, '')
                        .replace(/^(types?|enters?|fills?|inputs?|writes?|ingresa|escribe|introduce)\s+/i, '')
                        .replace(/\b(in|into|in the|en el|en la|en)\b/i, '')
                        .replace(/\s+/g, ' ')
                        .trim() || 'input field';
                }
            }
        }

        const toolArgs: Record<string, unknown> = { element, text: inputText };
        // Submit = true for search steps (press Enter after typing)
        if (isSearch) toolArgs.submit = true;

        return {
            stepIndex: step.index, stepText: step.text,
            toolName: 'browser_type',
            toolArgs,
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

    // Then (GherkinStepParser already normalizes Entonces→Then)
    if (step.keyword === 'Then') {
        // Use the first quoted value (already extracted from both ' and " quotes)
        // If nothing quoted, extract meaningful text: remove "should see/deberia ver/contener" prefixes
        const waitText = quoted[0] ?? step.text
            .replace(/^(the user|user|el usuario|usuario)\s+/i, '')
            .replace(/^(should see|should contain|debería ver|deberia ver|debería contener|deberia contener|should be|debería estar|ve|see)\s+/i, '')
            .replace(/^(the message|el mensaje|el texto|the text)\s+/i, '')
            .trim();

        return {
            stepIndex: step.index, stepText: step.text,
            toolName: 'browser_wait_for',
            toolArgs: { text: waitText },
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
