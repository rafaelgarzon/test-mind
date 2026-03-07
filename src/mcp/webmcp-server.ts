/**
 * src/mcp/webmcp-server.ts — Fase 7.2
 *
 * Servidor MCP HTTP+SSE que expone las capacidades de preview e implementación
 * como herramientas MCP accesibles desde Claude Code, Claude Desktop u otros
 * clientes MCP via transport HTTP/SSE.
 *
 * El widget WebMCP (webmcp.dev) en el browser se conecta a este endpoint,
 * permitiendo que la Web UI sea un servidor MCP nativo.
 *
 * Endpoints:
 *   GET  /mcp/sse      → SSE stream (MCP transport)
 *   POST /mcp/message  → Recibe mensajes MCP del cliente
 *
 * Herramientas expuestas:
 *   - preview_scenario(gherkin, steps?)     → PreviewResult con screenshots
 *   - implement_scenario(gherkin, steps, featureName) → escribe archivos
 *   - get_scenario_state()                  → estado actual de la UI
 */
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import {
    ListToolsRequestSchema,
    CallToolRequestSchema,
    ErrorCode,
    McpError,
} from '@modelcontextprotocol/sdk/types.js';
import { Router, Request, Response } from 'express';
import { PreviewAgent } from '../ai/agents/PreviewAgent';
import { implement } from '../ai/agents/ScenarioImplementer';

/** Estado compartido de la UI, actualizado via POST /api/state */
export interface UIState {
    gherkin: string | null;
    steps: string | null;
    quality: { score: number; passed: boolean; issues: string[] } | null;
}

let uiState: UIState = { gherkin: null, steps: null, quality: null };

/** Actualiza el estado de la UI (llamado desde server.ts) */
export function updateUIState(patch: Partial<UIState>): void {
    uiState = { ...uiState, ...patch };
}

/** Retorna el estado actual de la UI */
export function getUIState(): UIState {
    return { ...uiState };
}

// Mapa de transports activos (session_id → SSEServerTransport)
const transports: Map<string, SSEServerTransport> = new Map();

/**
 * Crea y configura el servidor MCP para WebMCP.
 * Retorna un Express Router que debe montarse en `/mcp`.
 */
export function createWebMcpRouter(): Router {
    const router = Router();

    const mcpServer = new Server(
        { name: 'automation-front-ai-webmcp', version: '7.2.0' },
        { capabilities: { tools: {} } }
    );

    // ── Listar herramientas ───────────────────────────────────────────────
    mcpServer.setRequestHandler(ListToolsRequestSchema, async () => ({
        tools: [
            {
                name: 'preview_scenario',
                description: 'Ejecuta un escenario Gherkin en un navegador real usando Playwright y retorna screenshots por paso. Úsalo para validar antes de implementar.',
                inputSchema: {
                    type: 'object',
                    properties: {
                        gherkin: {
                            type: 'string',
                            description: 'Texto Gherkin completo del escenario a ejecutar.',
                        },
                        steps: {
                            type: 'string',
                            description: 'Step Definitions TypeScript (opcional, solo para metadata).',
                        },
                    },
                    required: ['gherkin'],
                },
            },
            {
                name: 'implement_scenario',
                description: 'Escribe los archivos .feature y .steps.ts al proyecto. Usar después de validar con preview_scenario.',
                inputSchema: {
                    type: 'object',
                    properties: {
                        gherkin: {
                            type: 'string',
                            description: 'Texto Gherkin del escenario.',
                        },
                        steps: {
                            type: 'string',
                            description: 'Código TypeScript de Step Definitions.',
                        },
                        featureName: {
                            type: 'string',
                            description: 'Nombre del archivo (slug, ej: "hotel-search"). Sin extensión, sin espacios.',
                        },
                    },
                    required: ['gherkin', 'steps', 'featureName'],
                },
            },
            {
                name: 'get_scenario_state',
                description: 'Retorna el estado actual de la Web UI: último Gherkin generado, Steps y score de calidad.',
                inputSchema: {
                    type: 'object',
                    properties: {},
                },
            },
        ],
    }));

    // ── Ejecutar herramientas ─────────────────────────────────────────────
    mcpServer.setRequestHandler(CallToolRequestSchema, async (request) => {
        switch (request.params.name) {

            case 'preview_scenario': {
                const gherkin = String(request.params.arguments?.gherkin ?? '').trim();
                if (!gherkin) {
                    throw new McpError(ErrorCode.InvalidParams, 'El campo gherkin es requerido.');
                }

                try {
                    const agent = new PreviewAgent();
                    const preview = await agent.preview(gherkin);

                    const summary = preview.steps.map((s, i) =>
                        `${s.status === 'passed' ? '✅' : s.status === 'failed' ? '❌' : '⏭'} Paso ${i + 1} (${s.keyword}): ${s.stepText}${s.error ? '\n   Error: ' + s.error : ''}`
                    ).join('\n');

                    return {
                        content: [{
                            type: 'text',
                            text: [
                                `Preview: ${preview.passed ? '✅ PASÓ' : '❌ FALLÓ'} — ${preview.totalDurationMs}ms — ${preview.browserUsed}`,
                                '',
                                summary,
                                '',
                                `Pasos con screenshot: ${preview.steps.filter(s => s.screenshotBase64).length}/${preview.steps.length}`,
                            ].join('\n'),
                        }],
                        isError: !preview.passed,
                    };
                } catch (err: any) {
                    return {
                        content: [{ type: 'text', text: `Error: ${err.message}` }],
                        isError: true,
                    };
                }
            }

            case 'implement_scenario': {
                const gherkin    = String(request.params.arguments?.gherkin ?? '').trim();
                const steps      = String(request.params.arguments?.steps ?? '').trim();
                const featureName= String(request.params.arguments?.featureName ?? '').trim();

                if (!gherkin || !steps || !featureName) {
                    throw new McpError(ErrorCode.InvalidParams, 'Los campos gherkin, steps y featureName son requeridos.');
                }

                try {
                    const result = await implement({ gherkin, steps, featureName });
                    if (result.success) {
                        return {
                            content: [{
                                type: 'text',
                                text: [
                                    '✅ Archivos implementados exitosamente:',
                                    `  Feature: ${result.featurePath}`,
                                    `  Steps:   ${result.stepsPath}`,
                                ].join('\n'),
                            }],
                        };
                    } else {
                        return {
                            content: [{ type: 'text', text: `❌ Error: ${result.error}` }],
                            isError: true,
                        };
                    }
                } catch (err: any) {
                    return {
                        content: [{ type: 'text', text: `Error: ${err.message}` }],
                        isError: true,
                    };
                }
            }

            case 'get_scenario_state': {
                const state = getUIState();
                return {
                    content: [{
                        type: 'text',
                        text: JSON.stringify(state, null, 2),
                    }],
                };
            }

            default:
                throw new McpError(ErrorCode.MethodNotFound, `Tool desconocido: ${request.params.name}`);
        }
    });

    // ── SSE Transport — GET /mcp/sse ──────────────────────────────────────
    router.get('/sse', async (req: Request, res: Response) => {
        const sessionId = `session-${Date.now()}-${Math.random().toString(36).slice(2)}`;

        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');
        res.setHeader('Access-Control-Allow-Origin', '*');

        const transport = new SSEServerTransport('/mcp/message', res);
        transports.set(sessionId, transport);

        req.on('close', () => {
            transports.delete(sessionId);
            console.log(`[WebMCP] Cliente desconectado: ${sessionId}`);
        });

        console.log(`[WebMCP] Cliente conectado: ${sessionId}`);
        await mcpServer.connect(transport);
    });

    // ── Message endpoint — POST /mcp/message ─────────────────────────────
    router.post('/message', async (req: Request, res: Response) => {
        // Enviar mensaje al transport activo más reciente
        const latestTransport = Array.from(transports.values()).pop();
        if (!latestTransport) {
            return res.status(503).json({ error: 'No hay clientes MCP conectados' });
        }
        await latestTransport.handlePostMessage(req, res);
    });

    return router;
}
