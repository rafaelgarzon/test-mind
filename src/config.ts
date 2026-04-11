/**
 * src/config.ts — Fase 6: Validación centralizada de variables de entorno
 *
 * Valida al arranque que la configuración sea coherente.
 * Importar `config` en vez de leer process.env directamente.
 */
import { z } from 'zod';
import * as dotenv from 'dotenv';
dotenv.config();

const EnvSchema = z.object({
    AI_PROVIDER: z.enum(['openai', 'ollama']).default('ollama'),
    OPENAI_API_KEY: z.string().optional(),
    OLLAMA_BASE_URL: z.string().url().default('http://localhost:11434'),
    AI_MODEL: z.string().default('llama3.2'),
    // Fase 15: Modelo de embeddings separado del modelo de chat.
    // Usar un modelo especializado evita inconsistencias en ChromaDB al cambiar AI_MODEL.
    // Recomendado: bge-m3 (72% recall) o nomic-embed-text (ligero).
    EMBEDDING_MODEL: z.string().default('bge-m3'),
    PORT: z.coerce.number().int().positive().default(3000),
    // Fase 7: Preview y auto-implementación
    PREVIEW_BROWSER: z.enum(['chromium', 'firefox', 'webkit']).default('chromium'),
    PREVIEW_HEADLESS: z.coerce.boolean().default(true),
    IMPLEMENT_FEATURES_DIR: z.string().optional(),   // ruta absoluta opcional; por defecto ./features
}).refine(
    (env) => env.AI_PROVIDER !== 'openai' || !!env.OPENAI_API_KEY,
    {
        message: 'OPENAI_API_KEY es requerida cuando AI_PROVIDER=openai',
        path: ['OPENAI_API_KEY'],
    }
);

export type AppConfig = z.infer<typeof EnvSchema>;

function loadConfig(): AppConfig {
    const result = EnvSchema.safeParse(process.env);
    if (!result.success) {
        console.error('❌ Configuración de entorno inválida:');
        result.error.issues.forEach((issue) => {
            console.error(`   ${String(issue.path.join('.'))}: ${issue.message}`);
        });
        process.exit(1);
    }
    return result.data;
}

export const config = loadConfig();
