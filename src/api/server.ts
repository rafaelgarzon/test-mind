import express, { Request, Response } from 'express';
import cors from 'cors';
import * as dotenv from 'dotenv';
import { AgentOrchestrator } from '../ai/core/AgentOrchestrator';
import { OllamaProvider } from '../ai/OllamaProvider';
import { OpenAIClient } from '../ai/infrastructure/OpenAIClient';
import { AIProvider } from '../ai/infrastructure/AIProvider';
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
import { buildDefaultPipeline } from '../ai/pipeline/defaultPipeline';

dotenv.config();

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
    let ollamaProvider: OllamaProvider | null = null;
    let aiProvider: AIProvider;

    try {
        const providerName = (process.env.AI_PROVIDER ?? 'ollama').toLowerCase();
        const ollamaUrl = process.env.OLLAMA_BASE_URL ?? 'http://localhost:11434';
        const model = process.env.AI_MODEL ?? 'llama3.2';

        sendEvent({ agent: 'Backend', status: `Iniciando proveedor AI: ${providerName}...` });

        // 1. Instanciar proveedor según variable de entorno
        if (providerName === 'openai') {
            aiProvider = new OpenAIClient(process.env.AI_MODEL ?? 'gpt-4o');
        } else {
            ollamaProvider = new OllamaProvider({ baseUrl: ollamaUrl, model });
            aiProvider = ollamaProvider;
        }

        mcpClient = new McpPlaywrightClient();

        // 2. Instanciar Agentes
        // ChromaDB requiere Ollama para embeddings; si el proveedor es OpenAI se usará
        // el fallback gracioso de ChromaVectorStore (isAvailable=false si falla)
        const embeddingProvider = ollamaProvider ?? new OllamaProvider({ baseUrl: ollamaUrl, model });
        const chromaStore = new ChromaVectorStore('http://localhost:8000', embeddingProvider);
        const dupAgent = new DuplicatePreventionAgent(chromaStore);

        const reqAgent = new RequirementsAgent();
        const alignAgent = new BusinessAlignmentAgent(aiProvider);
        const codeGenAgent = new CodeGeneratorAgent(aiProvider, mcpClient);
        
        const previewRunner = new ScenarioPreviewRunner(aiProvider, mcpClient);
        const valAgent = new ValidationAgent(previewRunner);
        
        const repAgent = new ReportingAgent();
        const reviewAgent = new ReviewImplementerAgent();

        // 3. Construir el pipeline declarativo y el orquestador plug-in
        const pipelineSteps = buildDefaultPipeline({
            duplicatePreventionAgent: dupAgent,
            businessAlignmentAgent: alignAgent,
            requirementsAgent: reqAgent,
            codeGeneratorAgent: codeGenAgent,
            validationAgent: valAgent,
            reportingAgent: repAgent,
            reviewImplementerAgent: reviewAgent,
        });
        const orchestrator = new AgentOrchestrator(pipelineSteps);

        // 4. Ejecutar Pipeline, pasando el callback para el Streaming de Eventos
        const result = await orchestrator.executePipeline(
            userRequirement,
            (agent: string, status: string, finished?: boolean) => {
                sendEvent({ agent, status, finished: finished ?? false });
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
