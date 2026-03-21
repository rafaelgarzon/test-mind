import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { PlaywrightToolExecutor, McpToolResult } from "../agents/ScenarioPreviewRunner";

export class McpPlaywrightClient implements PlaywrightToolExecutor {
    private client: Client;
    private transport: StdioClientTransport;
    private isConnected: boolean = false;

    constructor() {
        this.client = new Client(
            { name: "automation-front-ai", version: "1.0.0" },
            { capabilities: {} }
        );

        // Conecta mediante stdio a un proceso ejecutado DENTRO del contenedor Docker
        // Usamos `npx -y @modelcontextprotocol/server-playwright` para levantar el servidor
        this.transport = new StdioClientTransport({
            command: "docker",
            args: ["exec", "-i", "mcp_playwright", "npx", "-y", "@modelcontextprotocol/server-playwright"]
        });
    }

    private async ensureConnection() {
        if (!this.isConnected) {
            console.log("[McpPlaywrightClient] Conectando al contenedor mcp_playwright sobre stdio...");
            await this.client.connect(this.transport);
            this.isConnected = true;
            console.log("[McpPlaywrightClient] Conexión MCP establecida.");
        }
    }

    async execute(toolName: string, args: Record<string, unknown>): Promise<McpToolResult> {
        try {
            await this.ensureConnection();
            
            console.log(`[McpPlaywrightClient] Solicitando tool: ${toolName}`);
            const response = await this.client.callTool({
                name: toolName,
                arguments: args
            });

            return {
                content: response.content as any[],
                isError: !!response.isError
            };
        } catch (error: any) {
            console.error(`[McpPlaywrightClient] Error ejecutando tool ${toolName}:`, error);
            return {
                content: [{ type: 'text', text: error.message || String(error) }],
                isError: true
            };
        }
    }

    async close(): Promise<void> {
        if (this.isConnected) {
            await this.client.close();
            this.isConnected = false;
            console.log("[McpPlaywrightClient] Conexión MCP cerrada.");
        }
    }
}
