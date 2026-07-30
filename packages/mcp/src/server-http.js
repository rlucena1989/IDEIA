"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.McpHttpServer = void 0;
exports.createMcpHttpServer = createMcpHttpServer;
const http_1 = require("http");
const logger_1 = require("@ideia/logger");
const https_1 = require("https");
const node_fs_1 = require("node:fs");
const node_path_1 = require("node:path");
const node_crypto_1 = __importDefault(require("node:crypto"));
const logger = (0, logger_1.createLogger)('mcp-http-server');
function loadMcpTlsOptions() {
    const certDir = (0, node_path_1.join)(process.cwd(), 'certs');
    const keyPath = (0, node_path_1.join)(certDir, 'key.pem');
    const certPath = (0, node_path_1.join)(certDir, 'cert.pem');
    try {
        if ((0, node_fs_1.existsSync)(keyPath) && (0, node_fs_1.existsSync)(certPath)) {
            return {
                key: (0, node_fs_1.readFileSync)(keyPath),
                cert: (0, node_fs_1.readFileSync)(certPath),
                secureOptions: node_crypto_1.default.constants.SSL_OP_NO_TLSv1 | node_crypto_1.default.constants.SSL_OP_NO_TLSv1_1,
                ciphers: 'TLS_AES_256_GCM_SHA384:TLS_CHACHA20_POLY1305_SHA256',
                honorCipherOrder: true,
                minVersion: 'TLSv1.3',
            };
        }
    }
    catch { /* certs not found — HTTP fallback */ }
    return undefined;
}
function setSecurityHeaders(res) {
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
class McpHttpServer {
    server = null;
    registry;
    port;
    allowedOrigins;
    apiKey;
    bodySizeLimit;
    tlsOptions;
    constructor(config) {
        this.registry = config.registry;
        this.port = config.port;
        this.allowedOrigins = config.allowedOrigins ?? ['http://localhost:3000', 'http://127.0.0.1:3000'];
        this.apiKey = config.apiKey;
        this.bodySizeLimit = config.bodySizeLimit ?? 1_048_576;
        this.tlsOptions = config.tls !== false ? loadMcpTlsOptions() : undefined;
    }
    async start() {
        const handler = (req, res) => this.handleRequest(req, res);
        return new Promise((resolve) => {
            this.server = this.tlsOptions
                ? (0, https_1.createServer)(this.tlsOptions, handler)
                : (0, http_1.createServer)(handler);
            this.server.listen(this.port, () => {
                if (this.tlsOptions)
                    logger.info('[MCP] TLS 1.3 enabled (AES-256-GCM + CHACHA20-POLY1305)');
                resolve();
            });
        });
    }
    async stop() {
        return new Promise((resolve) => {
            if (this.server) {
                this.server.close(() => resolve());
                this.server = null;
            }
            else
                resolve();
        });
    }
    isOriginAllowed(origin) {
        return this.allowedOrigins.includes(origin) || this.allowedOrigins.includes('*');
    }
    checkAuth(req) {
        if (!this.apiKey)
            return true;
        const authHeader = req.headers['authorization'] || '';
        const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
        return token === this.apiKey;
    }
    async handleRequest(req, res) {
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
            }
            else if (url === '/mcp/resources' && method === 'GET') {
                const resources = this.registry.getResources();
                res.writeHead(200);
                res.end(JSON.stringify({ ok: true, resources }));
            }
            else if (url === '/mcp/prompts' && method === 'GET') {
                const prompts = this.registry.getPrompts();
                res.writeHead(200);
                res.end(JSON.stringify({ ok: true, prompts }));
            }
            else if (url === '/mcp/manifest' && method === 'GET') {
                const servers = this.registry.listServers();
                const manifest = { servers: servers.map(s => ({ name: s.name, version: s.version, toolCount: s.tools.length, resourceCount: s.resources.length, promptCount: s.prompts.length })) };
                res.writeHead(200);
                res.end(JSON.stringify({ ok: true, manifest }));
            }
            else if (url === '/mcp/call' && method === 'POST') {
                const body = await this.readBody(req);
                const parsed = JSON.parse(body);
                if (!parsed.name || typeof parsed.name !== 'string') {
                    res.writeHead(400);
                    res.end(JSON.stringify({ ok: false, error: 'Invalid request: "name" is required' }));
                    return;
                }
                const result = await this.registry.callTool(parsed.name, parsed.args || {});
                res.writeHead(result.ok ? 200 : 404);
                res.end(JSON.stringify(result));
            }
            else if (url === '/mcp/read' && method === 'POST') {
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
            }
            else {
                res.writeHead(404);
                res.end(JSON.stringify({ ok: false, error: 'Not found' }));
            }
        }
        catch (err) {
            res.writeHead(500);
            res.end(JSON.stringify({ ok: false, error: String(err) }));
        }
    }
    readBody(req) {
        return new Promise((resolve, reject) => {
            let size = 0;
            const chunks = [];
            req.on('data', (chunk) => {
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
exports.McpHttpServer = McpHttpServer;
function createMcpHttpServer(config) {
    return new McpHttpServer(config);
}
//# sourceMappingURL=server-http.js.map