import express from 'express';
import cors from 'cors';
import path from 'path';
import { ScenarioGenerator } from '../ai/ScenarioGenerator';
import { OllamaProvider } from '../ai/OllamaProvider';
import { PreviewAgent } from '../ai/agents/PreviewAgent';
import { implement } from '../ai/agents/ScenarioImplementer';
import { createWebMcpRouter, updateUIState } from '../mcp/webmcp-server';
import { config } from '../config'; // Fase 6 (M-06): validación de entorno al arranque

const app = express();
const port = config.PORT;

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// Fase 7.2: Montar servidor MCP HTTP+SSE en /mcp
app.use('/mcp', createWebMcpRouter());
console.log(`🔌 MCP SSE endpoint disponible en http://localhost:${config.PORT}/mcp/sse`);

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
            const quality = {
                score: result.quality.score,
                passed: result.quality.passed,
                issues: result.quality.issues,
            };
            // Fase 7.2: sincronizar estado con WebMCP server
            updateUIState({ gherkin: result.gherkin, quality });
            res.json({ success: true, gherkin: result.gherkin, quality });
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
        // Fase 7.2: sincronizar steps en estado WebMCP
        if (steps) updateUIState({ steps });
        res.json({ success: true, steps });
    } catch (e) {
        res.status(500).json({ error: String(e) });
    }
});

// ─── FASE 7: Preview y Auto-implementación ───────────────────────────────────

/**
 * POST /api/preview
 * Ejecuta el escenario Gherkin en un navegador real usando @playwright/mcp
 * y retorna screenshots + estado de cada paso.
 * Body: { gherkin: string, steps?: string }
 */
app.post('/api/preview', async (req: express.Request, res: express.Response) => {
    const { gherkin } = req.body;
    if (!gherkin?.trim()) {
        return res.status(400).json({ error: 'gherkin is required' });
    }

    try {
        const agent = new PreviewAgent();
        const preview = await agent.preview(gherkin);
        res.json({ success: true, preview });
    } catch (err: any) {
        console.error('[/api/preview] Error:', err.message);
        res.status(500).json({ error: err.message, details: err.stack?.split('\n')[1] });
    }
});

/**
 * POST /api/implement
 * Escribe los archivos .feature y .steps.ts al proyecto.
 * Body: { gherkin: string, steps: string, featureName: string }
 */
app.post('/api/implement', async (req: express.Request, res: express.Response) => {
    const { gherkin, steps, featureName } = req.body;
    if (!gherkin?.trim() || !steps?.trim() || !featureName?.trim()) {
        return res.status(400).json({ error: 'gherkin, steps and featureName are required' });
    }

    try {
        const result = await implement({ gherkin, steps, featureName });
        if (result.success) {
            res.json({ success: true, featurePath: result.featurePath, stepsPath: result.stepsPath });
        } else {
            res.status(500).json({ error: result.error });
        }
    } catch (err: any) {
        console.error('[/api/implement] Error:', err.message);
        res.status(500).json({ error: err.message });
    }
});

/**
 * GET /api/state — Fase 7.2
 * Retorna el estado actual de la UI (último gherkin, steps y quality).
 * Usado por el WebMCP tool get_scenario_state.
 */
app.get('/api/state', (_req, res) => {
    const { getUIState } = require('../mcp/webmcp-server');
    res.json(getUIState());
});

app.listen(port, () => {
    console.log(`🚀 UI Web server running at http://localhost:${port}`);
});
