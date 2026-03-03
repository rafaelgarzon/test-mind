/**
 * src/mcp/server.ts — Fase 6 (M-02): Actualizado para usar ScenarioGenerator (Fase 5)
 * en lugar del CodeGenerator legacy. Ahora expone quality score en la respuesta.
 */
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
    CallToolRequestSchema,
    ListToolsRequestSchema,
    ErrorCode,
    McpError,
} from "@modelcontextprotocol/sdk/types.js";
import * as fs from 'fs';
import * as path from 'path';
import * as child_process from 'child_process';
import { ScenarioGenerator } from '../ai/ScenarioGenerator';

const server = new Server(
    {
        name: "automation-front-ai",
        version: "2.0.0",
    },
    {
        capabilities: { tools: {} },
    }
);

const generator = new ScenarioGenerator();
generator.initialize().catch((e) => {
    console.error("MCP: No se pudo conectar con Ollama al iniciar:", e.message);
});

server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
        tools: [
            {
                name: "generate_scenario",
                description: "Genera un escenario Gherkin y sus Step Definitions TypeScript a partir de un requerimiento en lenguaje natural. Incluye score de calidad (0-100) y escribe los archivos al proyecto.",
                inputSchema: {
                    type: "object",
                    properties: {
                        requirement: {
                            type: "string",
                            description: "Requerimiento o historia de usuario en lenguaje natural (español o inglés).",
                        },
                        feature_name: {
                            type: "string",
                            description: "Nombre del archivo .feature a generar (ej: 'hotel-search'). Sin extensión.",
                        },
                    },
                    required: ["requirement"],
                },
            },
            {
                name: "run_tests",
                description: "Ejecuta los tests Playwright del proyecto.",
                inputSchema: {
                    type: "object",
                    properties: {
                        grep: {
                            type: "string",
                            description: "Filtro regex para ejecutar solo ciertos tests.",
                        },
                    },
                },
            },
        ],
    };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
    switch (request.params.name) {

        case "generate_scenario": {
            const requirement = String(request.params.arguments?.requirement ?? '');
            const featureName = String(request.params.arguments?.feature_name ?? 'generated-scenario');

            if (!requirement.trim()) {
                throw new McpError(ErrorCode.InvalidParams, "El campo 'requirement' es requerido.");
            }

            try {
                const result = await generator.generateScenario(requirement);

                if (!result) {
                    return {
                        content: [{ type: "text", text: "❌ No se pudo generar el escenario. Verifica que Ollama esté corriendo." }],
                        isError: true,
                    };
                }

                const steps = await generator.generateStepDefinitions(result.gherkin);

                const featuresDir = path.resolve(process.cwd(), 'features');
                const stepsDir = path.resolve(process.cwd(), 'features/step_definitions');
                if (!fs.existsSync(featuresDir)) fs.mkdirSync(featuresDir, { recursive: true });
                if (!fs.existsSync(stepsDir)) fs.mkdirSync(stepsDir, { recursive: true });

                const featurePath = path.join(featuresDir, `${featureName}.feature`);
                const stepsPath = path.join(stepsDir, `${featureName}.steps.ts`);

                fs.writeFileSync(featurePath, result.gherkin, 'utf-8');
                if (steps) fs.writeFileSync(stepsPath, steps, 'utf-8');

                const qualityLine = `📊 Calidad: ${result.quality.score}/100 — ${result.quality.passed ? '✅ Aprobado' : '⚠️ Con observaciones'}`;
                const issuesLine = result.quality.issues.length > 0
                    ? `\n   Observaciones: ${result.quality.issues.join('; ')}`
                    : '';

                return {
                    content: [{
                        type: "text",
                        text: [
                            `✅ Escenario generado exitosamente.`,
                            qualityLine + issuesLine,
                            `📄 Feature:  ${featurePath}`,
                            steps ? `📄 Steps:    ${stepsPath}` : '⚠️  Steps no generados.',
                            `\n--- Gherkin ---\n${result.gherkin}`,
                        ].join('\n'),
                    }],
                };
            } catch (error: any) {
                return {
                    content: [{ type: "text", text: `Error: ${error.message}` }],
                    isError: true,
                };
            }
        }

        case "run_tests": {
            const grep = request.params.arguments?.grep
                ? String(request.params.arguments.grep)
                : null;
            const cmd = grep
                ? `npx playwright test --grep "${grep}"`
                : `npx playwright test`;

            return new Promise((resolve) => {
                child_process.exec(cmd, (error, stdout, stderr) => {
                    resolve({
                        content: [{ type: "text", text: `Output:\n${stdout}\nErrors:\n${stderr}` }],
                        isError: !!error,
                    });
                });
            });
        }

        default:
            throw new McpError(ErrorCode.MethodNotFound, `Tool desconocido: ${request.params.name}`);
    }
});

async function run() {
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error("MCP Server v2 corriendo en stdio (pipeline Fase 5)");
}

run();
