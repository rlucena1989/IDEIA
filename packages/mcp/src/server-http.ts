import { createServer, IncomingMessage, ServerResponse } from 'http';
import { MCPRegistry } from './index';

export interface McpHttpServerConfig {
  port: number;
  registry: MCPRegistry;
}

export class McpHttpServer {
  private server: ReturnType<typeof createServer> | null = null;
  private registry: MCPRegistry;
  private port: number;

  constructor(config: McpHttpServerConfig) {
    this.registry = config.registry;
    this.port = config.port;
  }

  async start(): Promise<void> {
    return new Promise((resolve) => {
      this.server = createServer((req, res) => this.handleRequest(req, res));
      this.server.listen(this.port, () => {
        resolve();
      });
    });
  }

  async stop(): Promise<void> {
    return new Promise((resolve) => {
      if (this.server) {
        this.server.close(() => resolve());
        this.server = null;
      } else resolve();
    });
  }

  private async handleRequest(req: IncomingMessage, res: ServerResponse): Promise<void> {
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Access-Control-Allow-Origin', '*');

    const url = req.url || '/';
    const method = req.method || 'GET';

    try {
      if (url === '/mcp/tools' && method === 'GET') {
        const tools = this.registry.getTools();
        res.writeHead(200);
        res.end(JSON.stringify({ ok: true, tools }));
      } else if (url === '/mcp/resources' && method === 'GET') {
        const resources = this.registry.getResources();
        res.writeHead(200);
        res.end(JSON.stringify({ ok: true, resources }));
      } else if (url === '/mcp/prompts' && method === 'GET') {
        const prompts = this.registry.getPrompts();
        res.writeHead(200);
        res.end(JSON.stringify({ ok: true, prompts }));
      } else if (url === '/mcp/manifest' && method === 'GET') {
        const servers = this.registry.listServers();
        const manifest = { servers: servers.map(s => ({ name: s.name, version: s.version, toolCount: s.tools.length, resourceCount: s.resources.length, promptCount: s.prompts.length })) };
        res.writeHead(200);
        res.end(JSON.stringify({ ok: true, manifest }));
      } else if (url === '/mcp/call' && method === 'POST') {
        const body = await this.readBody(req);
        const { name, args } = JSON.parse(body);
        const result = await this.registry.callTool(name, args || {});
        res.writeHead(result.ok ? 200 : 404);
        res.end(JSON.stringify(result));
      } else if (url === '/mcp/read' && method === 'POST') {
        const body = await this.readBody(req);
        const { uri } = JSON.parse(body);
        const result = await this.registry.readResource(uri);
        res.writeHead(result.ok ? 200 : 404);
        res.end(JSON.stringify(result));
      } else {
        res.writeHead(404);
        res.end(JSON.stringify({ ok: false, error: 'Not found' }));
      }
    } catch (err) {
      res.writeHead(500);
      res.end(JSON.stringify({ ok: false, error: String(err) }));
    }
  }

  private readBody(req: IncomingMessage): Promise<string> {
    return new Promise((resolve, reject) => {
      const chunks: Buffer[] = [];
      req.on('data', (chunk: Buffer) => chunks.push(chunk));
      req.on('end', () => resolve(Buffer.concat(chunks).toString()));
      req.on('error', reject);
    });
  }
}

export function createMcpHttpServer(config: McpHttpServerConfig): McpHttpServer {
  return new McpHttpServer(config);
}
