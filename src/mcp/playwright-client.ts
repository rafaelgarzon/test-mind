/**
 * src/mcp/playwright-client.ts — Fase 7.1
 *
 * Implementa PlaywrightToolExecutor usando @playwright/mcp como proceso hijo.
 * El cliente MCP se comunica con el servidor Playwright MCP via stdio.
 */
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import * as fs from 'fs';
import * as path from 'path';
import { PlaywrightToolExecutor, McpToolResult } from '../ai/agents/ScenarioPreviewRunner';

/**
 * Resuelve la ruta al binario playwright-mcp subiendo el árbol de directorios
 * desde __dirname, igual que la resolución de módulos de Node.js.
 * Esto funciona tanto en el proyecto principal como en worktrees, donde
 * process.cwd() apunta a un node_modules incompleto.
 */
function resolvePlaywrightMcpBin(): string {
    const binName = process.platform === 'win32' ? 'playwright-mcp.cmd' : 'playwright-mcp';
    let dir = __dirname;
    for (let i = 0; i < 8; i++) {
        const candidate = path.join(dir, 'node_modules', '.bin', binName);
        if (fs.existsSync(candidate)) return candidate;
        const parent = path.dirname(dir);
        if (parent === dir) break; // llegamos a la raíz del filesystem
        dir = parent;
    }
    // Último recurso: asumir que está en el PATH del sistema
    return 'playwright-mcp';
}

export interface PlaywrightMcpOptions {
    browser?: 'chromium' | 'firefox' | 'webkit';
    headless?: boolean;
    timeout?: number;
}

export class PlaywrightMcpClient implements PlaywrightToolExecutor {
    private constructor(
        private readonly client: Client,
        private readonly transport: StdioClientTransport,
    ) {}

    /**
     * Crea y conecta un cliente MCP al servidor Playwright MCP local.
     */
    static async create(options: PlaywrightMcpOptions = {}): Promise<PlaywrightMcpClient> {
        const browser = options.browser ?? 'chromium';
        const headless = options.headless ?? true;

        // Resolver el binario subiendo el árbol desde __dirname (funciona en worktrees)
        const mcpBin = resolvePlaywrightMcpBin();

        const args: string[] = ['--browser', browser];
        if (headless) args.push('--headless');

        const transport = new StdioClientTransport({
            command: mcpBin,
            args,
        });

        const client = new Client(
            { name: 'automation-front-ai-preview', version: '7.1.0' },
            { capabilities: {} }
        );

        await client.connect(transport);
        console.log(`[PlaywrightMcpClient] Conectado a @playwright/mcp (${browser}, headless=${headless})`);

        return new PlaywrightMcpClient(client, transport);
    }

    async execute(toolName: string, args: Record<string, unknown>): Promise<McpToolResult> {
        const result = await this.client.callTool({ name: toolName, arguments: args });
        return result as McpToolResult;
    }

    async close(): Promise<void> {
        try {
            // Intentar cerrar el browser limpiamente antes de matar el proceso
            await this.client.callTool({ name: 'browser_close', arguments: {} }).catch(() => {});
        } finally {
            await this.transport.close();
            console.log('[PlaywrightMcpClient] Conexión cerrada');
        }
    }
}
