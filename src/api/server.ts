import express, { Request, Response } from 'express';
import cors from 'cors';
import { AgentOrchestrator } from '../ai/core/AgentOrchestrator';
import { OllamaProvider } from '../ai/OllamaProvider';
import { McpPlaywrightClient } from '../ai/infrastructure/McpPlaywrightClient';
import { RequirementsAgent } from '../ai/agents/RequirementsAgent';
import { CodeGeneratorAgent } from '../ai/agents/CodeGeneratorAgent';
import { ValidationAgent } from '../ai/agents/ValidationAgent';
import { ReportingAgent } from '../ai/agents/ReportingAgent';
import { ReviewImplementerAgent } from '../ai/agents/ReviewImplementerAgent';
import { ScenarioPreviewRunner } from '../ai/agents/ScenarioPreviewRunner';
import { DuplicatePreventionAgent } from '../ai/agents/DuplicatePreventionAgent';
import { BusinessAlignmentAgent } from '../ai/agents/BusinessAlignmentAgent';
import { ChromaVectorStore } from '../ai/infrastructure/ChromaVectorStore';

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

app.post('/api/v1/generate-scenario', async (req: Request, res: Response): Promise<void> => {
    const { userRequirement } = req.body;

    if (!userRequirement) {
        res.status(400).json({ success: false, error: "El campo 'userRequirement' es obligatorio." });
        return;
    }

    // Configurar cabeceras obligatorias para el protocolo Server-Sent Events (SSE)
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    // Helper para enviar el SSE con formato correcto
    const sendEvent = (eventData: any) => {
        res.write(`data: ${JSON.stringify(eventData)}\n\n`);
    };

    let mcpClient: McpPlaywrightClient | null = null;
    let aiProvider: OllamaProvider | null = null;

    try {
        sendEvent({ agent: 'Backend', status: 'Iniciando servicios de infraestructura AI...' });

        // 1. Instanciar Infraestructura Real
        aiProvider = new OllamaProvider({ baseUrl: 'http://localhost:11434', model: 'llama3.2' });
        mcpClient = new McpPlaywrightClient();

        // 2. Instanciar Agentes
        const chromaStore = new ChromaVectorStore('http://localhost:8000', aiProvider);
        const dupAgent = new DuplicatePreventionAgent(chromaStore);

        const reqAgent = new RequirementsAgent();
        const alignAgent = new BusinessAlignmentAgent(aiProvider);
        const codeGenAgent = new CodeGeneratorAgent(aiProvider, mcpClient);
        
        const previewRunner = new ScenarioPreviewRunner(aiProvider, mcpClient);
        const valAgent = new ValidationAgent(previewRunner);
        
        const repAgent = new ReportingAgent();
        const reviewAgent = new ReviewImplementerAgent();

        // 3. Orquestador
        const orchestrator = new AgentOrchestrator(
            dupAgent, alignAgent, reqAgent, codeGenAgent, valAgent, repAgent, reviewAgent
        );

        // 4. Ejecutar Pipeline, pasando el callback para el Streaming de Eventos
        const result = await orchestrator.executePipeline(
            userRequirement,
            (agent: string, status: string) => {
                sendEvent({ agent, status });
            }
        );

        // 5. Enviar el veredicto final a la conexión
        sendEvent({ agent: 'Backend', finished: true, result });
        
    } catch (err: any) {
        console.error("Error crítico en el endpoint:", err);
        sendEvent({ agent: 'Backend', error: err.message, finished: true });
    } finally {
        // En cualquier caso, asegurarse de cerrar el cliente MCP para liberar el navegador Docker
        if (mcpClient) {
            await mcpClient.close();
        }
        res.end();
    }
});

// Iniciamos el servidor Web API
app.listen(PORT, () => {
    console.log(`🤖 Front-AI Backbone Controller iniciado en http://localhost:${PORT}`);
    console.log(`   Ruta SSE lista: POST /api/v1/generate-scenario`);
});
