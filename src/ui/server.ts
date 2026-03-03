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
