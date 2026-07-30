/**
 * ide-server.ts — Servidor HTTP/WebSocket da IDE
 *
 * Inicia um servidor HTTP que expõe a API da IDE para o frontend se conectar.
 * Endpoints:
 *   - /api/* → API REST (file system, terminal, session, approval, memory)
 *   - /ws    → WebSocket para eventos em tempo real (file watcher, task progress)
 *   - /lsp   → WebSocket relay para LSP
 *   - /pty   → WebSocket para terminal interativo (node-pty)
 *
 * Uso via CLI:
 *   ideia ide --port 3001 --root /path/to/project
 *
 * Ou programaticamente:
 *   import { startIdeServer } from './ide/ide-server';
 *   const server = await startIdeServer({ port: 3001, root: process.cwd() });
 */

import http from 'node:http';
import { createLogger } from '@ideia/logger';
const logger = createLogger('ide.ide-server');
import https from 'node:https';
import path from 'node:path';
import url from 'node:url';
import { WebSocketServer, WebSocket as WsWebSocket } from 'ws';
import { FileBridge } from './file-bridge';
import { TerminalBridge } from './terminal-bridge';
import { createApiRouter } from './api-router';
import { createSession, getActiveSession, IdeSession } from './session-manager';
import { MemoryStore } from '@ideia/memory-store';
import { AuditTrail } from '@ideia/audit-trail';
import { AgentRuntime } from '@ideia/agent-runtime';
import { createBus, WSBroadcast, createWSBroadcast, type IEventBus } from '@ideia/event-bus';
import type { EventType } from '@ideia/event-bus';
import { createChatHandler } from './chat-bridge';
import { LspBridge } from './lsp-bridge';
import { SecurityMiddleware, createSecurityMiddleware } from './security-middleware';
import { loadTlsOptions } from '../utils/crypto-utils';

export interface IdeServerOptions {
  port: number;
  root: string;
  host?: string;
  staticDir?: string;
  tls?: boolean;
}

export interface IdeServerInstance {
  server: http.Server;
  wss: WebSocketServer;
  address: string;
  stop: () => Promise<void>;
}

const _MIME_TYPES: Record<string, string> = {
  '.html': 'text/html',
  '.js': 'application/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.map': 'application/json',
};

export async function startIdeServer(opts: IdeServerOptions): Promise<IdeServerInstance> {
  const port = opts.port || 3001;
  const host = opts.host || '127.0.0.1';
  const root = path.resolve(opts.root || process.cwd());
  const staticDir = opts.staticDir || '';

  // Inicializar bridges
  const fileBridge = new FileBridge(root);
  const terminalBridge = new TerminalBridge(root);
  const memoryStore = new MemoryStore(path.join(root, '.ai', 'ide', 'memory.json'));
  const auditTrail = new AuditTrail(path.join(root, '.ai', 'ide', 'audit.json'));
  const agentRuntime = new AgentRuntime(auditTrail, memoryStore);
  const eventBus = await createBus();
  const wsBroadcast = createWSBroadcast({ port: port + 1, host, path: '/events' });
  wsBroadcast.start(eventBus);

  // Sessão
  let activeSession: IdeSession | null = getActiveSession(root);
  if (!activeSession) {
    activeSession = createSession(root);
    broadcast('session:created', { sessionId: activeSession.session_id, workspace: root });
  }

  // Lista de comandos CLI para /api/commands
  const commands: { name: string; description: string }[] = [
    { name: 'init', description: 'Initialize ai-devkit in the current project' },
    { name: 'status', description: 'Show project status' },
    { name: 'verify', description: 'Run quality verification' },
    { name: 'doctor', description: 'Run diagnostics' },
    { name: 'ide', description: 'Start IDE server' },
  ];

  const ctx = {
    root,
    fileBridge,
    terminalBridge,
    memoryStore,
    session: activeSession,
    commands,
    getSession: () => {
      if (!activeSession) activeSession = createSession(root);
      return activeSession;
    },
    auditTrail,
    agentRuntime,
    broadcast: (type: string, data: unknown) => broadcast(type, data),
  };

  const apiRoutes = createApiRouter(ctx);
  const chatHandler = createChatHandler(auditTrail, path.join(root, '.ai', 'ide', 'chat-memory.json'), root, agentRuntime);
  const security = createSecurityMiddleware();

  // TLS auto-detect
  const tlsEnabled = opts.tls !== false;
  const tlsOpts = tlsEnabled ? loadTlsOptions(path.join(root, 'certs')) : null;
  const server = tlsOpts
    ? https.createServer(tlsOpts, (req, res) => {
        security.setSecurityHeaders(res);
        handleRequest(req, res);
      })
    : http.createServer((req, res) => {
        security.setSecurityHeaders(res);
        handleRequest(req, res);
      });

  function handleRequest(req: http.IncomingMessage, res: http.ServerResponse): void {
    // CORS - validate Origin header
    const allowedOrigins = [`http://${host}:${port}`, 'http://localhost:3000', 'http://127.0.0.1:3000'];
    const origin = req.headers['origin'] || '';
    const allowOrigin = allowedOrigins.includes(origin) ? origin : `http://${host}:${port}`;
    res.setHeader('Access-Control-Allow-Origin', allowOrigin);
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    if (req.method === 'OPTIONS') {
      res.writeHead(204);
      res.end();
      return;
    }

    // Rate limiting
    if (!security.applyRateLimit(req, res)) return;

    // API key auth (only if configured)
    if (!security.checkApiKey(req, res)) return;

    const parsed = url.parse(req.url || '', true);
    const routeKey = `${req.method} ${parsed.pathname}`;

    // Chat SSE endpoint (special handling — SSE streaming)
    if (parsed.pathname === '/api/chat/completions') {
      chatHandler(req, res);
      return;
    }

    // API routes
    if (parsed.pathname?.startsWith('/api/')) {
      const handler = apiRoutes[routeKey];
      if (handler) {
        try {
          const result = handler(req, res, parsed);
          if (result instanceof Promise) {
            result.catch((e: Error) => {
              res.writeHead(500, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ ok: false, error: e.message }));
            });
          }
        } catch (e) {
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ ok: false, error: (e as Error).message }));
        }
      } else {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: false, error: `Not found: ${routeKey}` }));
      }
      return;
    }

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      name: 'IDEIA Server',
      version: '0.1.0',
      docs: 'https://ideia.dev/docs',
      endpoints: Object.keys(apiRoutes),
    }));
  }

  // WebSocket
  const wss = new WebSocketServer({ server, path: '/ws' });
  // Subscriptions: quais eventos cada cliente quer receber
  const clientSubs = new WeakMap<WsWebSocket, Set<string>>();

  wss.on('connection', (ws: WsWebSocket) => {
    logger.info('[IDE] WebSocket client connected');
    const subs = new Set<string>(['file:change', 'terminal:execution']);
    clientSubs.set(ws, subs);

    ws.on('message', (data: Buffer) => {
      try {
        const msg = JSON.parse(data.toString());
        if (msg.type === 'subscribe' && msg.events) {
          msg.events.forEach((e: string) => subs.add(e));
          ws.send(JSON.stringify({ type: 'subscribed', events: Array.from(subs) }));
        } else if (msg.type === 'unsubscribe' && msg.events) {
          msg.events.forEach((e: string) => subs.delete(e));
          ws.send(JSON.stringify({ type: 'unsubscribed', events: Array.from(subs) }));
        } else if (msg.type === 'ping') {
          ws.send(JSON.stringify({ type: 'pong' }));
        }
      } catch {
        ws.send(JSON.stringify({ type: 'error', data: 'invalid json' }));
      }
    });

    ws.send(JSON.stringify({
      type: 'connected',
      data: {
        sessionId: activeSession?.session_id,
        workspace: root,
        policy: activeSession?.policy || 'ask',
        events: Array.from(subs),
      },
    }));

    ws.on('close', () => logger.info('[IDE] WebSocket client disconnected'));
  });

  function broadcast(type: string, data: unknown): void {
    const msg = JSON.stringify({ type, data });
    wss.clients.forEach((client: WsWebSocket) => {
      if (client.readyState === 1) {
        const subs = clientSubs.get(client);
        if (!subs || subs.has(type)) {
          try { client.send(msg); } catch { /* ignore send errors per client */ }
        }
      }
    });
  }

  // LSP WebSocket relay (no auth — security warning)
  const lspBridge = new LspBridge();
  const lspWss = new WebSocketServer({ server, path: '/lsp' });
  console.warn('[IDE] LSP WebSocket exposed at /lsp without authentication — only use in trusted networks');
  lspWss.on('connection', (ws: WsWebSocket) => {
    const session = lspBridge.spawnServer(root);
    logger.info('[IDE] LSP session started: ${session.id}');

    ws.on('message', (data: Buffer) => {
      lspBridge.sendMessage(session.id, data.toString());
    });

    lspBridge.on('lsp:message', ({ sessionId, data }) => {
      if (sessionId === session.id && ws.readyState === ws.OPEN) {
        ws.send(data);
      }
    });

    lspBridge.on('lsp:error', ({ sessionId, data }) => {
      if (sessionId === session.id && ws.readyState === ws.OPEN) {
        ws.send(JSON.stringify({ jsonrpc: '2.0', method: 'telemetry/event', params: { error: data } }));
      }
    });

    ws.on('close', () => {
      lspBridge.kill(session.id);
      logger.info('[IDE] LSP session closed: ${session.id}');
    });
  });

  // File change events → WebSocket broadcast
  fileBridge.on('change', (event) => { broadcast('file:change', event); });

  // PTY WebSocket (interactive terminal)
  let ptyCounter = 0;
  const ptyWss = new WebSocketServer({ server, path: '/pty' });
  ptyWss.on('connection', (ws: WsWebSocket, req) => {
    const params = url.parse(req.url || '', true).query;
    const rawCwd = (params.cwd as string) || root;
    const cwd = path.isAbsolute(rawCwd) ? rawCwd : path.resolve(root, rawCwd);
    const id = `pty_${++ptyCounter}`;
    const shellType = process.platform === 'win32' ? 'powershell.exe' : (process.env.SHELL || 'bash');

    const session = terminalBridge.openPty(id, cwd);
    if (!session) {
      ws.send(JSON.stringify({ type: 'error', data: 'Failed to start PTY. node-pty may not be available.' }));
      ws.close();
      return;
    }

    ws.send(JSON.stringify({ type: 'started', data: { id, shell: shellType, cwd } }));

    session.process?.onData((data: string) => {
      if (ws.readyState === ws.OPEN) {
        ws.send(JSON.stringify({ type: 'data', data }));
      }
    });

    ws.on('message', (buf: Buffer) => {
      try {
        const msg = JSON.parse(buf.toString());
        if (msg.type === 'input') {
          terminalBridge.writePty(id, msg.data);
        } else if (msg.type === 'resize') {
          terminalBridge.resizePty(id, msg.cols, msg.rows);
        }
      } catch {
        // raw input for interactive apps
        terminalBridge.writePty(id, buf.toString());
      }
    });

    ws.on('close', () => {
      terminalBridge.closePty(id);
    });
  });

  // Forward key events to EventBus (for WSBroadcast consumers)
  fileBridge.on('change', (event) => {
    eventBus.emit({ type: 'file:change' as EventType, source: 'file-bridge', payload: { code: event } });
  });
  terminalBridge.on('execution', (event) => {
    eventBus.emit({ type: 'terminal:execution' as EventType, source: 'terminal-bridge', payload: { agent: event } });
  });

  // Terminal execution events → WebSocket
  terminalBridge.on('execution', (event) => { broadcast('terminal:execution', event); });

  // Iniciar file watcher
  fileBridge.startWatcher();

  return new Promise((resolve) => {
    server.listen(port, host, () => {
      const proto = tlsOpts ? 'https' : 'http';
      const addr = `${proto}://${host}:${port}`;
      logger.info('[IDE] Server running at ${addr}');
      if (tlsOpts) logger.info('[IDE] TLS 1.3 enabled (AES-256-GCM + CHACHA20-POLY1305)');
      logger.info('[IDE] Workspace root: ${root}');
      logger.info('[IDE] WebSocket at ${proto === \'https\' ? \'wss\' : \'ws\'}://${host}:${port}/ws');
      if (staticDir) logger.info('[IDE] Static files: ${staticDir}');
      resolve({
        server,
        wss,
        address: addr,
        stop: async () => {
          fileBridge.stopWatcher();
          lspBridge.killAll();
          terminalBridge.closeAllPty();
          lspWss.close();
          ptyWss.close();
          wss.close();
          security.destroy();
          return new Promise((resolveClose) => server.close(() => resolveClose()));
        },
      });
    });
  });
}
