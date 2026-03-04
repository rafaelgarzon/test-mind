/**
 * src/ai/core/GherkinStepParser.ts — Fase 7
 *
 * Parsea texto Gherkin raw y extrae los pasos (Given/When/Then) de forma
 * determinista, sin dependencia de IA. Los pasos And/But se normalizan al
 * tipo del keyword principal anterior.
 */

export type GherkinKeyword = 'Given' | 'When' | 'Then';

export interface ParsedGherkinStep {
    keyword: GherkinKeyword;
    rawKeyword: string;          // keyword original en el texto (incluye And/But)
    text: string;                // texto del paso sin keyword
    index: number;               // posición en el scenario (0-based)
}

const PRIMARY_KEYWORDS = ['Given', 'When', 'Then'] as const;
const ALL_KEYWORDS = ['Given', 'When', 'Then', 'And', 'But'] as const;

// Soporta Español e Inglés
const KEYWORD_ALIASES: Record<string, GherkinKeyword> = {
    given: 'Given', cuando: 'Given', dado: 'Given',
    when: 'When', cuando2: 'When', si: 'When',
    then: 'Then', entonces: 'Then', y: 'Then',
    and: 'Then',  // se sobreescribe por contexto
    but: 'Then',  // se sobreescribe por contexto
};

const STEP_RE = /^\s*(Given|When|Then|And|But|Dado|Cuando|Entonces|Y|Pero)\s+(.+)/i;

export class GherkinStepParser {
    /**
     * Parsea el Gherkin completo y retorna los pasos del Scenario.
     * Ignora líneas Feature:, Scenario:, y comentarios (#).
     */
    static parse(gherkin: string): ParsedGherkinStep[] {
        const lines = gherkin.split('\n');
        const steps: ParsedGherkinStep[] = [];
        let lastPrimary: GherkinKeyword = 'Given';

        for (const line of lines) {
            const match = STEP_RE.exec(line);
            if (!match) continue;

            const rawKeyword = match[1];
            const text = match[2].trim();
            const lower = rawKeyword.toLowerCase();

            let keyword: GherkinKeyword;

            if (lower === 'given' || lower === 'dado') {
                keyword = 'Given';
                lastPrimary = 'Given';
            } else if (lower === 'when' || lower === 'cuando') {
                keyword = 'When';
                lastPrimary = 'When';
            } else if (lower === 'then' || lower === 'entonces') {
                keyword = 'Then';
                lastPrimary = 'Then';
            } else {
                // And / But / Y / Pero → hereda el último keyword primario
                keyword = lastPrimary;
            }

            steps.push({
                keyword,
                rawKeyword,
                text,
                index: steps.length,
            });
        }

        return steps;
    }
}
