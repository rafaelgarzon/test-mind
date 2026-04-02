/**
 * src/ai/agents/ScenarioPreviewRunner.ts — Fase 7 (compartido)
 *
 * Motor de ejecución de preview de escenarios Gherkin.
 * Transport-agnostic: recibe un PlaywrightToolExecutor que puede ser
 * implementado con @playwright/mcp (Fase 7.1) o cualquier otro transport.
 *
 * Estrategia de traducción de pasos:
 *  1. Heurístico síncrono (siempre disponible, instantáneo)
 *  2. LLM como mejora opcional con timeout corto (15s) — si falla, usa heurístico
 *
 * Estrategia de ejecución (snapshot-first):
 *  - browser_click / browser_type / browser_hover / browser_select_option
 *    requieren un `ref` del árbol de accesibilidad (@playwright/mcp API).
 *  - Antes de cada acción interactiva, el runner llama browser_snapshot,
 *    parsea el YAML de accesibilidad y busca el `ref` más relevante.
 *  - El snapshot se cachea entre pasos y se invalida tras navegación o acción.
 */
import { AIProvider } from '../infrastructure/AIProvider';
import { GherkinStepParser } from '../core/GherkinStepParser';
import {
    buildGherkinToPlaywrightMessages,
    parseTranslationResponse,
    heuristicTranslate,
    TranslatedPlaywrightAction,
} from '../prompts/GherkinToPlaywrightPrompt';

export interface McpToolContent {
    type: string;
    text?: string;
    data?: string;        // base64 para imágenes
    mimeType?: string;
}

export interface McpToolResult {
    content: McpToolContent[];
    isError?: boolean;
}

/**
 * Interfaz de transport para herramientas Playwright.
 * Implementada por PlaywrightMcpClient (7.1) u otros providers.
 */
export interface PlaywrightToolExecutor {
    execute(toolName: string, args: Record<string, unknown>): Promise<McpToolResult>;
    close(): Promise<void>;
}

export interface StepPreviewResult {
    index: number;
    stepText: string;
    keyword: string;
    status: 'passed' | 'failed' | 'skipped';
    screenshotBase64: string | null;
    error?: string;
    durationMs: number;
}

export interface PreviewResult {
    steps: StepPreviewResult[];
    passed: boolean;
    totalDurationMs: number;
    browserUsed: string;
}

/** Tools que requieren un ref del árbol de accesibilidad */
const TOOLS_NEEDING_REF = new Set([
    'browser_click',
    'browser_type',
    'browser_hover',
    'browser_select_option',
]);

/** Timeout máximo para la EJECUCIÓN completa en el navegador (sin traducción) */
const EXECUTION_TIMEOUT_MS = 120_000;

/** Timeout corto para la mejora vía LLM — si supera esto, usamos heurístico */
const LLM_TRANSLATE_TIMEOUT_MS = 12_000;

export class ScenarioPreviewRunner {
    constructor(
        private readonly ai: AIProvider | null,
        private readonly executor: PlaywrightToolExecutor,
        private readonly browserLabel: string = 'chromium',
    ) {}

    async run(gherkin: string): Promise<PreviewResult> {
        const overallStart = Date.now();
        const parsedSteps = GherkinStepParser.parse(gherkin);

        if (parsedSteps.length === 0) {
            return {
                steps: [],
                passed: false,
                totalDurationMs: 0,
                browserUsed: this.browserLabel,
            };
        }

        // Traducir pasos: heurístico primero (síncrono), LLM como mejora opcional
        const actions = await this.translateSteps(parsedSteps);

        const results: StepPreviewResult[] = [];
        let failed = false;

        // Ejecución en navegador con timeout global
        const executionPromise = this.executeSteps(parsedSteps, actions, results);
        await Promise.race([
            executionPromise.then(didFail => { failed = didFail; }),
            new Promise<void>((_, reject) =>
                setTimeout(() => reject(new Error('Timeout en ejecución del navegador')), EXECUTION_TIMEOUT_MS)
            ),
        ]);

        return {
            steps: results,
            passed: !failed,
            totalDurationMs: Date.now() - overallStart,
            browserUsed: this.browserLabel,
        };
    }

    /**
     * Ejecuta los pasos en el navegador con patrón snapshot-first para refs.
     * Retorna `true` si hubo fallo.
     *
     * Mejoras Fase 7 (rev 3):
     *  - Pasos Then: verificación por snapshot antes de browser_wait_for
     *    (detecta "Proceed To Checkout" cuando se busca "Checkout")
     *  - browser_type fallback: solo aplica a pasos de búsqueda (submit=true)
     *  - Normalización de idioma en findRefInSnapshot
     */
    private async executeSteps(
        parsedSteps: ReturnType<typeof GherkinStepParser.parse>,
        actions: TranslatedPlaywrightAction[],
        results: StepPreviewResult[],
    ): Promise<boolean> {
        let failed = false;
        let currentSnapshotText: string | null = null;  // Caché del árbol de accesibilidad

        for (let i = 0; i < parsedSteps.length; i++) {
            const step = parsedSteps[i];
            const action = actions[i] ?? {
                stepIndex: i,
                stepText: step.text,
                toolName: 'browser_snapshot',
                toolArgs: {},
            };

            if (failed) {
                results.push({
                    index: i,
                    stepText: step.text,
                    keyword: step.rawKeyword,
                    status: 'skipped',
                    screenshotBase64: null,
                    durationMs: 0,
                });
                continue;
            }

            const stepStart = Date.now();
            let screenshotBase64: string | null = null;
            let error: string | undefined;
            let status: StepPreviewResult['status'] = 'passed';

            try {
                let toolName = action.toolName;
                let toolArgs: Record<string, unknown> = { ...action.toolArgs };

                // ── Snapshot-first: resolver ref para acciones interactivas ────────
                if (TOOLS_NEEDING_REF.has(toolName) && toolArgs.element && !toolArgs.ref) {
                    // Obtener snapshot fresco si no tenemos uno
                    if (!currentSnapshotText) {
                        const snapResult = await this.executor.execute('browser_snapshot', {});
                        currentSnapshotText = snapResult.content.find(c => c.type === 'text')?.text ?? null;
                    }

                    if (currentSnapshotText) {
                        // Fix 3: Pasar 'browser_type_search' para steps de búsqueda
                        // para que el fallback de "primer input" solo aplique a búsquedas
                        const typeHint = (toolName === 'browser_type' && toolArgs.submit === true)
                            ? 'browser_type_search'
                            : toolName;

                        const foundRef = this.findRefInSnapshot(
                            currentSnapshotText,
                            String(toolArgs.element),
                            typeHint,
                        );
                        if (foundRef) {
                            toolArgs = { ...toolArgs, ref: foundRef };
                            console.log(`[PreviewRunner] ${toolName}: ref=${foundRef} para element="${toolArgs.element}"`);
                        } else {
                            console.warn(`[PreviewRunner] ${toolName}: sin ref para "${toolArgs.element}", se intentará sin ref`);
                        }
                    }
                }

                // ── Fix 2: Then-step snapshot verification ────────────────────────
                // Los pasos Then ("debería ver...") verifican presencia de texto en la
                // página. browser_wait_for usa getByText() exact — falla si el texto
                // es substring de un elemento ("Checkout" en "Proceed To Checkout").
                // Solución: primero buscar en el snapshot completo (substring match),
                // que incluye labels de botones, links, headings, etc.
                let thenVerifiedViaSnapshot = false;
                if (toolName === 'browser_wait_for' && step.keyword === 'Then' && toolArgs.text) {
                    // Asegurar snapshot actualizado
                    if (!currentSnapshotText) {
                        const snapResult = await this.executor.execute('browser_snapshot', {});
                        currentSnapshotText = snapResult.content.find(c => c.type === 'text')?.text ?? null;
                    }

                    if (currentSnapshotText) {
                        const expectedText = this.normalizeForSearch(String(toolArgs.text));
                        const snapshotNorm = this.normalizeForSearch(currentSnapshotText);

                        if (snapshotNorm.includes(expectedText)) {
                            console.log(`[PreviewRunner] ✅ Then verificado por snapshot: "${toolArgs.text}"`);
                            thenVerifiedViaSnapshot = true;
                        } else {
                            // No encontrado en snapshot: reducir timeout de browser_wait_for
                            // a 3s para no bloquear demasiado (el error será más rápido)
                            console.log(`[PreviewRunner] "${toolArgs.text}" no encontrado en snapshot — intentando browser_wait_for (3s)`);
                            toolArgs = { ...toolArgs, timeout: 3000 };
                        }
                    }
                }

                // ── Ejecutar la acción del paso (salvo que Then ya verificado) ────
                if (!thenVerifiedViaSnapshot) {
                    const result = await this.executor.execute(toolName, toolArgs);
                    if (result.isError) {
                        throw new Error(result.content.find(c => c.type === 'text')?.text ?? 'Tool error');
                    }

                    // Invalidar snapshot tras navegación o acción interactiva
                    if (toolName === 'browser_navigate' || TOOLS_NEEDING_REF.has(toolName)) {
                        currentSnapshotText = null;
                    }

                    // Si el tool retornó un snapshot, almacenarlo en caché
                    if (toolName === 'browser_snapshot') {
                        currentSnapshotText = result.content.find(c => c.type === 'text')?.text ?? null;
                    }

                    // Si browser_type hizo submit (búsqueda), esperar navegación post-submit
                    if (toolName === 'browser_type' && toolArgs.submit === true) {
                        await this.executor.execute('browser_wait_for', { time: 4 });
                        currentSnapshotText = null; // Página cambió tras búsqueda
                    }
                }

                // Tomar screenshot después de cada paso (incluye pasos Then verificados)
                const screenshotResult = await this.executor.execute('browser_take_screenshot', {});
                screenshotBase64 = this.extractScreenshot(screenshotResult);

            } catch (err: any) {
                failed = true;
                status = 'failed';
                error = err.message ?? String(err);
                currentSnapshotText = null;  // Invalidar snapshot en error

                // Intentar screenshot del estado de fallo
                try {
                    const screenshotResult = await this.executor.execute('browser_take_screenshot', {});
                    screenshotBase64 = this.extractScreenshot(screenshotResult);
                } catch {
                    // screenshot de fallo también falló, no crítico
                }
            }

            results.push({
                index: i,
                stepText: step.text,
                keyword: step.rawKeyword,
                status,
                screenshotBase64,
                error,
                durationMs: Date.now() - stepStart,
            });
        }

        return failed;
    }

    /**
     * Normaliza texto para búsqueda cross-language:
     *  1. Elimina tildes/diacríticos (á→a, é→e, ñ→n, etc.)
     *  2. Mapea términos UI comunes español→inglés
     * Esto permite que un step en español encuentre elementos con labels en inglés
     * y viceversa (ej: "carrito" → "cart", "contraseña" → "password").
     */
    private normalizeForSearch(text: string): string {
        // Mapa de términos UI español → inglés (ordenado por frecuencia de uso)
        const ES_TO_EN: Record<string, string> = {
            buscar: 'search',   busqueda: 'search',  buscador: 'search',
            carrito: 'cart',    cesta: 'cart',       canasta: 'cart',
            contrasena: 'password', clave: 'password',
            correo: 'email',    electronico: 'email',
            usuario: 'username', nombre: 'name',     apellido: 'lastname',
            ingresar: 'login',  iniciar: 'login',    entrar: 'login',    sesion: 'session',
            registrar: 'register', registro: 'register', cuenta: 'account',
            inicio: 'home',     portada: 'home',
            agregar: 'add',     anadir: 'add',
            eliminar: 'delete', borrar: 'delete',    remover: 'remove',
            siguiente: 'next',  anterior: 'previous', atras: 'back',
            confirmar: 'confirm', aceptar: 'accept', cancelar: 'cancel',
            enviar: 'submit',   guardar: 'save',     proceder: 'proceed',
            pagar: 'checkout',  comprar: 'buy',      tienda: 'shop',
            producto: 'product', precio: 'price',
            boton: 'button',    campo: 'field',      enlace: 'link',
            mensaje: 'message', texto: 'text',       pagina: 'page',
            cerrar: 'close',    abrir: 'open',       ver: 'view',
        };

        // Paso 1: Quitar diacríticos (NFD separa base+acento, luego eliminamos acentos)
        const noAccents = text
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '');

        // Paso 2: Mapear palabras conocidas ES→EN y normalizar a lowercase sin puntuación
        return noAccents
            .toLowerCase()
            .replace(/[^a-z0-9\s]/g, ' ')
            .replace(/\s+/g, ' ')
            .trim()
            .split(' ')
            .map(w => ES_TO_EN[w] ?? w)
            .join(' ');
    }

    /**
     * Busca el ref de accesibilidad más relevante en el snapshot YAML.
     *
     * El snapshot de @playwright/mcp tiene líneas como:
     *   - button " Login" [ref=e21] [cursor=pointer]
     *   - textbox "Username" [ref=e16]
     *   - link "Home" [ref=e3]
     *
     * Estrategia de puntuación:
     *  - Fuerte bonus si el LABEL del elemento es corto y coincide (distingue
     *    textbox "Username" de heading "...username..." de longitud 200)
     *  - Bonus por tipo de elemento inferido del tool name
     *  - Normalización cross-language: español↔inglés antes de comparar
     *  - Fallback de "primer input" solo para búsquedas (browser_type_search),
     *    NO para browser_type genérico (evita tipear en campos equivocados)
     */
    private findRefInSnapshot(snapshotText: string, elementDesc: string, toolHint?: string): string | null {
        const lines = snapshotText.split('\n');

        // Normalizar needle: eliminar acentos + mapear ES→EN
        const needle = this.normalizeForSearch(elementDesc);
        const needleWords = needle.split(/\s+/).filter(w => w.length > 1);

        if (needleWords.length === 0) return null;

        const candidates: Array<{ ref: string; score: number; line: string }> = [];

        for (const line of lines) {
            const refMatch = line.match(/\[ref=(e\d+)\]/);
            if (!refMatch) continue;

            const ref = refMatch[1];

            // Normalizar línea completa y label para comparación cross-language
            const roleMatch = line.match(/^\s*-\s+(\w+)\s+"([^"]+)"/);
            const role = roleMatch ? roleMatch[1].toLowerCase() : '';
            const labelRaw = roleMatch ? roleMatch[2] : (line.match(/"([^"]+)"/)?.[1] ?? '');
            const label = this.normalizeForSearch(labelRaw);
            const lineNorm = this.normalizeForSearch(line);

            let score = 0;

            // Contar palabras del needle que aparecen en la línea normalizada
            const lineMatchCount = needleWords.filter(w => lineNorm.includes(w)).length;
            if (lineMatchCount === 0) continue;
            score += lineMatchCount * 5;

            // ── Label matching (core scoring) ────────────────────────────────
            if (label) {
                const labelWords = label.split(/\s+/).filter(w => w.length > 0);
                const labelMatchCount = needleWords.filter(w =>
                    labelWords.some(lw => lw.includes(w) || w.includes(lw))
                ).length;

                if (labelMatchCount > 0) {
                    // Bonus base por coincidencia en label
                    score += labelMatchCount * 15;

                    // Fuerte bonus si el label es CORTO (específico) y coincide bien
                    // Distingue textbox "Username" (corto) de heading "...username..." (largo)
                    const labelConciseness = Math.max(0, 1 - label.length / 50);
                    const matchRatio = labelMatchCount / needleWords.length;
                    score += Math.round(50 * labelConciseness * matchRatio);

                    // Penalización fuerte por labels muy largos (headings/descripciones)
                    if (label.length > 60) score -= 25;
                }
            }

            // ── Bonus por tipo de rol según el tool ──────────────────────────
            if (toolHint === 'browser_type' || toolHint === 'browser_fill' || toolHint === 'browser_type_search') {
                if (/^(textbox|input|textarea|searchbox|combobox)/.test(role)) score += 30;
                if (/^(heading|text|paragraph|generic|form|search)$/.test(role)) score -= 20;
            }
            if (toolHint === 'browser_click') {
                if (/^(button|link|menuitem|tab|checkbox|radio)/.test(role)) score += 20;
                if (line.includes('[cursor=pointer]')) score += 10;
            }
            if (toolHint === 'browser_select_option') {
                if (/^(combobox|listbox|select)/.test(role)) score += 30;
            }

            // ── Bonus genéricos por tipo y keyword (normalizados) ────────────
            if ((needle.includes('button') || needle.includes('boton')) && role === 'button') score += 20;
            if ((needle.includes('field') || needle.includes('input') || needle.includes('campo')) && /textbox|input/.test(role)) score += 20;
            if (needle.includes('link') && role === 'link') score += 15;
            if (needle.includes('checkbox') && role === 'checkbox') score += 15;

            // Bonus específico para búsqueda (tras normalización: "buscar"→"search")
            if (needle.includes('search') && /^(textbox|combobox|searchbox|input)/.test(role)) score += 25;

            // Bonus: elementos con cursor pointer son interactivos
            if (line.includes('[cursor=pointer]') && toolHint === 'browser_click') score += 8;

            candidates.push({ ref, score, line: line.trim() });
        }

        // ── Fallback cuando ningún candidato coincide ────────────────────────
        if (candidates.length === 0) {
            // browser_type_search → primer input de la página (SOLO para búsquedas)
            // NO aplica a browser_type genérico para evitar tipear en campos incorrectos
            if (toolHint === 'browser_type_search') {
                for (const line of lines) {
                    const refMatch = line.match(/\[ref=(e\d+)\]/);
                    if (!refMatch) continue;
                    if (/^\s*-\s+(textbox|combobox|searchbox|input|textarea)\s/i.test(line)) {
                        const ref = refMatch[1];
                        console.log(`[PreviewRunner] Fallback browser_type_search: primer input → ${ref} (${line.trim().substring(0, 60)})`);
                        return ref;
                    }
                }
            }

            // browser_click con ordinal → Nth link/button con cursor:pointer
            if (toolHint === 'browser_click') {
                const ordinalMap: Record<string, number> = {
                    primer: 1, primero: 1, first: 1, '1st': 1, '1ro': 1, '1er': 1,
                    segundo: 2, second: 2, '2nd': 2,
                    tercer: 3, tercero: 3, third: 3, '3rd': 3,
                };
                let targetN = 1;
                for (const [word, n] of Object.entries(ordinalMap)) {
                    if (needle.includes(word)) { targetN = n; break; }
                }
                const interactive: string[] = [];
                for (const line of lines) {
                    const refMatch = line.match(/\[ref=(e\d+)\]/);
                    if (!refMatch) continue;
                    if (/^\s*-\s+(link|button)\s/i.test(line) && line.includes('[cursor=pointer]')) {
                        interactive.push(refMatch[1]);
                    }
                }
                if (interactive.length >= targetN) {
                    const ref = interactive[targetN - 1];
                    console.log(`[PreviewRunner] Fallback browser_click: elemento #${targetN} interactivo → ${ref}`);
                    return ref;
                }
                if (interactive.length > 0) {
                    console.log(`[PreviewRunner] Fallback browser_click: primer interactivo → ${interactive[0]}`);
                    return interactive[0];
                }
            }
            return null;
        }

        candidates.sort((a, b) => b.score - a.score);
        console.log(`[PreviewRunner] Mejor ref para "${elementDesc}" (${toolHint}): ${candidates[0].ref} (score=${candidates[0].score}, line: "${candidates[0].line.substring(0, 80)}")`);
        return candidates[0].ref;
    }

    /**
     * Traduce pasos Gherkin → acciones Playwright.
     *
     * Estrategia:
     * 1. Calcula heurístico instantáneamente (siempre disponible como fallback)
     * 2. Si hay IA disponible, intenta mejorar con LLM con timeout corto (12s)
     * 3. Si LLM falla o timeout → retorna el heurístico
     */
    private async translateSteps(
        steps: ReturnType<typeof GherkinStepParser.parse>
    ): Promise<TranslatedPlaywrightAction[]> {
        // Heurístico: síncrono, instantáneo, siempre disponible
        const heuristicResult = steps.map(heuristicTranslate);

        if (!this.ai) {
            console.log('[PreviewRunner] Sin IA configurada, usando traducción heurística');
            return heuristicResult;
        }

        // Intentar mejora con LLM con timeout corto (Fase 8: usa generateChat + ContextBuilder)
        try {
            const messages = buildGherkinToPlaywrightMessages(steps);

            const llmResult = await Promise.race<TranslatedPlaywrightAction[]>([
                this.ai.generateChat(messages).then(raw => parseTranslationResponse(raw, steps)),
                new Promise<never>((_, reject) =>
                    setTimeout(() => reject(new Error('LLM timeout')), LLM_TRANSLATE_TIMEOUT_MS)
                ),
            ]);

            console.log('[PreviewRunner] Traducción LLM exitosa');
            return llmResult;

        } catch (err: any) {
            console.log(`[PreviewRunner] LLM no disponible (${err.message}) — usando heurístico`);
            return heuristicResult;
        }
    }

    private extractScreenshot(result: McpToolResult): string | null {
        // @playwright/mcp retorna screenshots como content con type:'image' y data en base64
        const imageContent = result.content.find(c => c.type === 'image' && c.data);
        if (imageContent?.data) return imageContent.data;

        // Algunos transports lo retornan como text con data URI
        const textContent = result.content.find(c => c.type === 'text' && c.text?.startsWith('data:image'));
        if (textContent?.text) {
            return textContent.text.replace(/^data:image\/[a-z]+;base64,/, '');
        }

        return null;
    }
}
