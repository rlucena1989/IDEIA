import { spawn, ChildProcess } from 'node:child_process';
import { createLogger } from '@ideia/logger';
import { EventEmitter } from 'node:events';
import { resolve } from 'node:path';

export interface LspSession {
  id: string;
  process: ChildProcess;
  connectedAt: string;
  buffer: string;
}

export class LspBridge extends EventEmitter {
  private sessions = new Map<string, LspSession>();

  spawnServer(workspaceRoot: string, serverPath?: string): LspSession {
    const id = `lsp_${Date.now()}`;
    let tsServer: string;
    try {
      tsServer = serverPath || require.resolve('typescript-language-server/lib/cli.mjs');
    } catch {
      console.warn('[LSP] typescript-language-server not found — LSP will not be available');
      const session: LspSession = { id, process: undefined as unknown as ChildProcess, connectedAt: new Date().toISOString(), buffer: '' };
      this.sessions.set(id, session);
      return session;
    }

    const child = spawn('node', [tsServer, '--stdio'], {
      cwd: workspaceRoot,
      stdio: ['pipe', 'pipe', 'pipe'],
      env: { ...process.env },
    });

    const session: LspSession = { id, process: child, connectedAt: new Date().toISOString(), buffer: '' };
    this.sessions.set(id, session);

    child.stdout?.on('data', (data: Buffer) => {
      session.buffer += data.toString();
      this.processBuffer(session);
    });

    child.stderr?.on('data', (data: Buffer) => {
      this.emit('lsp:error', { sessionId: id, data: data.toString() });
    });

    child.on('exit', (code) => {
      this.sessions.delete(id);
      this.emit('lsp:exit', { sessionId: id, code });
    });

    child.on('error', (err) => {
      this.sessions.delete(id);
      this.emit('lsp:error', { sessionId: id, data: err.message });
    });

    return session;
  }

  private processBuffer(session: LspSession): void {
    const { id } = session;
    let match: RegExpExecArray | null;
    const headerRe = /Content-Length:\s*(\d+)\r\n\r\n/g;
    while ((match = headerRe.exec(session.buffer)) !== null) {
      const length = parseInt(match[1], 10);
      const start = match.index + (match[0]?.length ?? 0);
      if (session.buffer.length < start + length) break;
      const json = session.buffer.slice(start, start + length);
      session.buffer = session.buffer.slice(start + length);
      this.emit('lsp:message', { sessionId: id, data: json });
      headerRe.lastIndex = 0;
    }
  }

  sendMessage(sessionId: string, data: string): void {
    const session = this.sessions.get(sessionId);
    if (!session || !session.process.stdin?.writable) return;
    const header = `Content-Length: ${Buffer.byteLength(data, 'utf-8')}\r\n\r\n`;
    session.process.stdin.write(header + data);
  }

  kill(sessionId: string): void {
    const session = this.sessions.get(sessionId);
    if (!session) return;
    try { session.process.kill(); } catch { /* process already dead */ }
    this.sessions.delete(sessionId);
  }

  killAll(): void {
    for (const [id] of this.sessions) this.kill(id);
  }
}

