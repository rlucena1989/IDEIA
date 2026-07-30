import { createServer as createHttpServer, IncomingMessage, ServerResponse } from 'http';
import { createLogger } from '@ideia/logger';
import { createServer as createHttpsServer } from 'https';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import crypto from 'node:crypto';
import { MCPRegistry } from './index';
const logger = createLogger('mcp-http-server');

export interface McpHttpServerConfig {
  port: number;
  registry: MCPRegistry;
  allowedOrigins?: string[];
  apiKey?: string;
  bodySizeLimit?: number;
  tls?: boolean;
}

function loadMcpTlsOptions(): object | undefined {
  const certDir = join(process.cwd(), 'certs');
  const keyPath = join(certDir, 'key.pem');
  const certPath = join(certDir, 'cert.pem');
  try {
    if (existsSync(keyPath) && existsSync(certPath)) {
      return {
        key: readFileSync(keyPath),
        cert: readFileSync(certPath),
        secureOptions: crypto.constants.SSL_OP_NO_TLSv1 | crypto.constants.SSL_OP_NO_TLSv1_1,
        ciphers: 'TLS_AES_256_GCM_SHA384:TLS_CHACHA20_POLY1305_SHA256',
        honorCipherOrder: true,
        minVersion: 'TLSv1.3',
      };
    }
  } catch { /* certs not found — HTTP fallback */ }
  return undefined;
}

function setSecurityHeaders(res: ServerResponse): void {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Content-Security-Policy', "default-src 'self'");
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), interest-cohort=()');
  res.setHeader('Cross-Origin-Embedder-Policy', 'require-corp');
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
  res.setHeader('Cross-Origin-Resource-Policy', 'same-origin');
}

export class McpHttpServer {
  private server: ReturnType<typeof createHttpServer | typeof createHttpsServer> | null = null;
  private registry: MCPRegistry;
  private port: number;
  private allowedOrigins: string[];
  private apiKey: string | undefined;
  private bodySizeLimit: number;
  private tlsOptions: object | undefined;

  constructor(config: McpHttpServerConfig) {
    this.registry = config.registry;
    this.port = config.port;
    this.allowedOrigins = config.allowedOrigins ?? ['http://localhost:3000', 'http://127.0.0.1:3000'];
    this.apiKey = config.apiKey;
    this.bodySizeLimit = config.bodySizeLimit ?? 1_048_576;
    this.tlsOptions = config.tls !== false ? loadMcpTlsOptions() : undefined;
  }

  async start(): Promise<void> {
    const handler = (req: IncomingMessage, res: ServerResponse) => this.handleRequest(req, res);
    return new Promise((resolve) => {
      this.server = this.tlsOptions
        ? createHttpsServer(this.tlsOptions, handler)
        : createHttpServer(handler);
      this.server.listen(this.port, () => {
        if (this.tlsOptions) logger.info('[MCP] TLS 1.3 enabled (AES-256-GCM + CHACHA20-POLY1305)');
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

  private isOriginAllowed(origin: string): boolean {
    return this.allowedOrigins.includes(origin) || this.allowedOrigins.includes('*');
  }

  private checkAuth(req: IncomingMessage): boolean {
    if (!this.apiKey) return true;
    const authHeader = req.headers['authorization'] || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
    return token === this.apiKey;
  }

  private async handleRequest(req: IncomingMessage, res: ServerResponse): Promise<void> {
    setSecurityHeaders(res);

    const origin = req.headers['origin'] || '';
    if (origin && !this.isOriginAllowed(origin)) {
      res.writeHead(403);
      res.end(JSON.stringify({ ok: false, error: 'Origin not allowed' }));
      return;
    }

    if (origin) {
      res.setHeader('Access-Control-Allow-Origin', this.isOriginAllowed(origin) ? origin : '');
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
      res.setHeader('Access-Control-Max-Age', '86400');
    }

    if (req.method === 'OPTIONS') {
      res.writeHead(204);
      res.end();
      return;
    }

    if (!this.checkAuth(req)) {
      res.writeHead(401);
      res.end(JSON.stringify({ ok: false, error: 'Unauthorized: invalid or missing API key' }));
      return;
    }

    res.setHeader('Content-Type', 'application/json');
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
        const parsed = JSON.parse(body);
        if (!parsed.name || typeof parsed.name !== 'string') {
          res.writeHead(400);
          res.end(JSON.stringify({ ok: false, error: 'Invalid request: "name" is required' }));
          return;
        }
        const result = await this.registry.callTool(parsed.name, (parsed.args as Record<string, unknown>) || {});
        res.writeHead(result.ok ? 200 : 404);
        res.end(JSON.stringify(result));
      } else if (url === '/mcp/read' && method === 'POST') {
        const body = await this.readBody(req);
        const parsed = JSON.parse(body);
        if (!parsed.uri || typeof parsed.uri !== 'string') {
          res.writeHead(400);
          res.end(JSON.stringify({ ok: false, error: 'Invalid request: "uri" is required' }));
          return;
        }
        const result = await this.registry.readResource(parsed.uri);
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
      let size = 0;
      const chunks: Buffer[] = [];
      req.on('data', (chunk: Buffer) => {
        size += chunk.length;
        if (size > this.bodySizeLimit) {
          reject(new Error('Request body too large'));
          return;
        }
        chunks.push(chunk);
      });
      req.on('end', () => resolve(Buffer.concat(chunks).toString()));
      req.on('error', reject);
    });
  }
}

export function createMcpHttpServer(config: McpHttpServerConfig): McpHttpServer {
  return new McpHttpServer(config);
}
