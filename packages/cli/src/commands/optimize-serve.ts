import { execFileSync } from 'node:child_process';
import path from 'node:path';
import http from 'node:http';
import { printHeader, printLine, printResult, finish } from "../utils/output";
import { getIO } from '../io';
import { readJson } from './optimize-pipeline';

export function handleOptimizeServe(options: { port: string; host: string; open?: boolean }): void {
  const cwd = process.cwd();
  const uiDir = path.join(cwd, '.ai/optimizer/ui');
  const runtimeDir = path.join(cwd, '.ai/optimizer/runtime');
  const port = parseInt(options.port, 10);
  const host = options.host;

  if (!getIO().fs.exists(uiDir)) {
    printLine(`[ERROR] UI directory not found: ${uiDir}`);
    finish({ checkpoint: 'optimize_serve', ok: false, status: 'failed', context_summary: 'UI nao encontrada' });
    return;
  }

  const MIME_TYPES: Record<string, string> = {
    '.html': 'text/html; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.js': 'application/javascript; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.png': 'image/png',
    '.svg': 'image/svg+xml',
    '.txt': 'text/plain; charset=utf-8',
    '.yaml': 'text/plain; charset=utf-8',
    '.yml': 'text/plain; charset=utf-8',
  };

  let sseClients: http.ServerResponse[] = [];
  const lastTimestamps: Record<string, number> = {};
  const watchInterval = setInterval(() => {
    if (!getIO().fs.exists(runtimeDir)) return;
    try {
      const files = getIO().fs.readDir(runtimeDir);
      let changed = false;
      for (const f of files) {
        const fp = path.join(runtimeDir, f);
        try {
          const mtime = getIO().fs.stat(fp).mtimeMs;
          if (!lastTimestamps[f] || lastTimestamps[f] < mtime) {
            lastTimestamps[f] = mtime;
            changed = true;
          }
        } catch { /* ignore */ }
      }
      if (changed) {
        for (const client of sseClients) {
          try {
            client.write(`data: ${JSON.stringify({ type: 'refresh' })}\n\n`);
          } catch { /* ignore */ }
        }
        sseClients = sseClients.filter(c => {
          try { return c.writable; } catch { return false; }
        });
      }
    } catch { /* ignore */ }
  }, 2000);

  const server = http.createServer((req, res) => {
    const url = new URL(req.url || '/', `http://${host}:${port}`);
    const pathname = url.pathname;

    if (pathname === '/api/status') {
      const runtimeFiles = ['latest-decision.json', 'latest-quality.json', 'latest-risk.json', 'latest-patch.json', 'latest-memory.json', 'latest-history.json'];
      const data: Record<string, unknown> = {};
      for (const f of runtimeFiles) {
        data[f.replace('latest-', '').replace('.json', '')] = readJson(path.join(runtimeDir, f));
      }
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(data));
      return;
    }

    if (pathname === '/api/events') {
      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      });
      res.write(`data: ${JSON.stringify({ type: 'connected' })}\n\n`);
      sseClients.push(res);
      req.on('close', () => {
        sseClients = sseClients.filter(c => c !== res);
      });
      return;
    }

    if (pathname.startsWith('/api/runtime/')) {
      const filename = pathname.replace('/api/runtime/', '');
      const filepath = path.join(runtimeDir, filename);
      if (getIO().fs.exists(filepath)) {
        const ext = path.extname(filename);
        res.writeHead(200, { 'Content-Type': MIME_TYPES[ext] || 'application/octet-stream' });
        res.end(getIO().fs.read(filepath));
      } else {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'File not found' }));
      }
      return;
    }

    let filePath = path.join(uiDir, pathname === '/' ? 'dashboard.html' : pathname);
    if (!getIO().fs.exists(filePath)) {
      filePath = path.join(uiDir, 'dashboard.html');
    }

    const ext = path.extname(filePath);
    try {
      const content = getIO().fs.read(filePath);
      res.writeHead(200, { 'Content-Type': MIME_TYPES[ext] || 'application/octet-stream' });
      res.end(content);
    } catch {
      res.writeHead(404);
      res.end('Not found');
    }
  });

  server.listen(port, host, () => {
    printHeader('Optimizer Dashboard Server');
    printResult('URL', true, `http://${host}:${port}`);
    printLine(`UI: ${uiDir}`);
    printLine('');
    printLine('Available API endpoints:');
    printLine('  GET /api/status  — All runtime data (JSON)');
    printLine('  GET /api/events  — Server-Sent Events (live refresh)');
    printLine('  GET /api/runtime/<file> — Individual runtime file');
    printLine('');
    printLine('Press Ctrl+C to stop');

    if (options.open) {
      const openCmd = process.platform === 'win32' ? 'start' : process.platform === 'darwin' ? 'open' : 'xdg-open';
      try { execFileSync(`${openCmd} http://${host}:${port}`); } catch { /* ignore */ }
    }
  });

  server.on('close', () => {
    clearInterval(watchInterval);
  });
}
