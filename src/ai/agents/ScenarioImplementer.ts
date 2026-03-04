/**
 * src/ai/agents/ScenarioImplementer.ts — Fase 7 (compartido)
 *
 * Escribe los archivos .feature y .steps.ts al proyecto.
 * Extraído del MCP server para reutilización en /api/implement.
 */
import * as fs from 'fs';
import * as path from 'path';

export interface ImplementRequest {
    gherkin: string;
    steps: string;
    featureName: string;   // slug, ej: "hotel-search"
}

export interface ImplementResult {
    success: boolean;
    featurePath: string;
    stepsPath: string;
    error?: string;
}

/** Sanitiza un nombre de feature: lowercase, espacios → hyphens, solo alfanumérico y hyphens */
function sanitizeFeatureName(name: string): string {
    return name
        .toLowerCase()
        .replace(/\s+/g, '-')
        .replace(/[^a-z0-9-]/g, '')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '')
        || 'generated-scenario';
}

export async function implement(req: ImplementRequest): Promise<ImplementResult> {
    const featureName = sanitizeFeatureName(req.featureName);

    // Resolver desde el directorio raíz del proyecto (2 niveles arriba de /src/ai/agents/)
    const projectRoot = path.resolve(__dirname, '../../..');
    const featuresDir = path.join(projectRoot, 'features');
    const stepsDir = path.join(projectRoot, 'features', 'step_definitions');

    const featurePath = path.join(featuresDir, `${featureName}.feature`);
    const stepsPath = path.join(stepsDir, `${featureName}.steps.ts`);

    try {
        if (!fs.existsSync(featuresDir)) fs.mkdirSync(featuresDir, { recursive: true });
        if (!fs.existsSync(stepsDir)) fs.mkdirSync(stepsDir, { recursive: true });

        fs.writeFileSync(featurePath, req.gherkin, 'utf-8');
        fs.writeFileSync(stepsPath, req.steps, 'utf-8');

        console.log(`[ScenarioImplementer] Feature → ${featurePath}`);
        console.log(`[ScenarioImplementer] Steps  → ${stepsPath}`);

        return { success: true, featurePath, stepsPath };
    } catch (err: any) {
        console.error('[ScenarioImplementer] Error escribiendo archivos:', err.message);
        return {
            success: false,
            featurePath,
            stepsPath,
            error: err.message,
        };
    }
}
