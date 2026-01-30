import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
    CallToolRequestSchema,
    ListToolsRequestSchema,
    ErrorCode,
    McpsError,
} from "@modelcontextprotocol/sdk/types.js";
import * as child_process from 'child_process';
import { generateTest } from '../ai/generator';

const server = new Server(
    {
        name: "automation-front-ai",
        version: "1.0.0",
    },
    {
        capabilities: {
            tools: {},
        },
    }
);

server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
        tools: [
            {
                name: "generate_test",
                description: "Generates a Serenity/JS Playwright test file based on a natural language scenario description.",
                inputSchema: {
                    type: "object",
                    properties: {
                        description: {
                            type: "string",
                            description: "The scenario description (e.g., 'User logs in with valid credentials').",
                        },
                        filename: {
                            type: "string",
                            description: "The output filename (e.g., 'login.spec.ts').",
                        },
                    },
                    required: ["description", "filename"],
                },
            },
            {
                name: "run_tests",
                description: "Executes the Playwright tests.",
                inputSchema: {
                    type: "object",
                    properties: {
                        grep: {
                            type: "string",
                            description: "Filter tests to run by name regex.",
                        },
                    },
                },
            },
        ],
    };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
    switch (request.params.name) {
        case "generate_test": {
            const description = String(request.params.arguments?.description);
            const filename = String(request.params.arguments?.filename);

            if (!description || !filename) {
                throw new McpsError(
                    ErrorCode.InvalidParams,
                    "Description and filename are required."
                );
            }

            try {
                const path = await generateTest(description, filename);
                return {
                    content: [
                        {
                            type: "text",
                            text: `Test generated successfully at: ${path}`,
                        },
                    ],
                };
            } catch (error: any) {
                return {
                    content: [
                        {
                            type: "text",
                            text: `Error generating test: ${error.message}`,
                        },
                    ],
                    isError: true,
                };
            }
        }

        case "run_tests": {
            const grep = request.params.arguments?.grep ? String(request.params.arguments.grep) : null;

            const cmd = grep ? `npx playwright test --grep "${grep}"` : `npx playwright test`;

            return new Promise((resolve) => {
                child_process.exec(cmd, (error, stdout, stderr) => {
                    resolve({
                        content: [
                            {
                                type: "text",
                                text: `Output:\n${stdout}\nErrors:\n${stderr}`,
                            }
                        ],
                        isError: !!error
                    });
                });
            });
        }

        default:
            throw new McpsError(
                ErrorCode.MethodNotFound,
                `Unknown tool: ${request.params.name}`
            );
    }
});

async function run() {
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error("MCP Server running on stdio");
}

run();
