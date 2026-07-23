import { spawn, ChildProcess } from 'node:child_process';
import { EventEmitter } from 'node:events';
import _path from 'node:path';

export interface DAPBreakpoint {
  id: number;
  line: number;
  file: string;
  verified: boolean;
}

export interface DAPStackFrame {
  id: number;
  name: string;
  line: number;
  column: number;
  file: string;
}

export interface DAPVariable {
  name: string;
  value: string;
  type: string;
  variablesReference: number;
}

export interface DAPScope {
  name: string;
  variables: DAPVariable[];
}

export interface DAPSession {
  id: string;
  process: ChildProcess | null;
  connectedAt: string;
  breakpoints: DAPBreakpoint[];
  stopped: boolean;
}

function createDAPMessage(command: string, args?: Record<string, unknown>, seq?: number): string {
  const msg = JSON.stringify({ seq: seq ?? 1, type: 'request', command, arguments: args });
  const header = `Content-Length: ${Buffer.byteLength(msg, 'utf-8')}\r\n\r\n`;
  return header + msg;
}

function parseDAPResponse(data: string): { seq: number; type: string; command?: string; body?: Record<string, unknown>; success?: boolean; message?: string } | null {
  const match = data.match(/Content-Length:\s*(\d+)\r\n\r\n([\s\S]*)/);
  if (!match) return null;
  try { return JSON.parse(match[2]); } catch { return null; }
}

export class DAPBridge extends EventEmitter {
  private sessions = new Map<string, DAPSession>();
  private seqCounter = 1;

  get nextSeq(): number { return this.seqCounter++; }

  attach(sessionId: string, debugServerPath: string, programPath: string, cwd: string): DAPSession {
    const session: DAPSession = {
      id: sessionId,
      process: null,
      connectedAt: new Date().toISOString(),
      breakpoints: [],
      stopped: false,
    };

    try {
      const child = spawn('node', [debugServerPath], {
        cwd,
        stdio: ['pipe', 'pipe', 'pipe'],
        env: { ...process.env },
      });

      session.process = child;
      let buffer = '';

      child.stdout?.on('data', (data: Buffer) => {
        buffer += data.toString();
        const msg = parseDAPResponse(buffer);
        if (msg) {
          buffer = '';
          this.emit('dap:message', { sessionId, message: msg });
          this.handleMessage(sessionId, msg);
        }
      });

      child.stderr?.on('data', (data: Buffer) => {
        this.emit('dap:stderr', { sessionId, data: data.toString() });
      });

      child.on('exit', (code) => {
        this.sessions.delete(sessionId);
        this.emit('dap:exit', { sessionId, code });
      });

      child.on('error', (err) => {
        this.emit('dap:error', { sessionId, error: err.message });
      });

      this.sendMessage(sessionId, 'initialize', {
        clientID: 'ideia',
        clientName: 'IDEIA Debugger',
        protocolVersion: '1.0',
        adapterID: 'node',
        locale: 'en',
        linesStartAt1: true,
        columnsStartAt1: true,
        supportsVariableType: true,
        supportsVariablePaging: true,
        supportsRunInTerminalRequest: true,
      });

      this.sendMessage(sessionId, 'launch', {
        program: programPath,
        cwd,
        console: 'integratedTerminal',
        stopOnEntry: false,
      });

    } catch (_err) {
      this.emit('dap:error', { sessionId, error: String(err) });
    }

    this.sessions.set(sessionId, session);
    return session;
  }

  sendMessage(sessionId: string, command: string, args?: Record<string, unknown>): void {
    const session = this.sessions.get(sessionId);
    if (!session?.process?.stdin?.writable) return;
    const data = createDAPMessage(command, args, this.nextSeq);
    session.process.stdin.write(data);
  }

  setBreakpoints(sessionId: string, file: string, lines: number[]): void {
    const breakpoints = lines.map((line, i) => ({ id: i + 1, line, file, verified: false }));
    this.sendMessage(sessionId, 'setBreakpoints', {
      source: { path: file },
      breakpoints: lines.map(l => ({ line: l })),
      lines,
    });
    const session = this.sessions.get(sessionId);
    if (session) session.breakpoints = breakpoints;
  }

  continue(sessionId: string): void { this.sendMessage(sessionId, 'continue'); }
  next(sessionId: string): void { this.sendMessage(sessionId, 'next'); }
  stepIn(sessionId: string): void { this.sendMessage(sessionId, 'stepIn'); }
  stepOut(sessionId: string): void { this.sendMessage(sessionId, 'stepOut'); }
  pause(sessionId: string): void { this.sendMessage(sessionId, 'pause'); }
  evaluate(sessionId: string, expression: string): void {
    this.sendMessage(sessionId, 'evaluate', { expression, context: 'repl' });
  }

  getStack(sessionId: string): void {
    this.sendMessage(sessionId, 'stackTrace', { threadId: 1 });
  }

  getScopes(sessionId: string, frameId: number): void {
    this.sendMessage(sessionId, 'scopes', { frameId });
  }

  getVariables(sessionId: string, variablesReference: number): void {
    this.sendMessage(sessionId, 'variables', { variablesReference });
  }

  disconnect(sessionId: string): void {
    this.sendMessage(sessionId, 'disconnect', { terminateDebuggee: true });
    const session = this.sessions.get(sessionId);
    if (session?.process) {
      setTimeout(() => {
        try { session.process?.kill(); } catch {}
        this.sessions.delete(sessionId);
      }, 1000);
    }
  }

  disconnectAll(): void {
    for (const [id] of this.sessions) this.disconnect(id);
  }

  isStopped(sessionId: string): boolean {
    return this.sessions.get(sessionId)?.stopped ?? false;
  }

  private handleMessage(sessionId: string, msg: { type: string; command?: string; body?: Record<string, unknown>; success?: boolean }): void {
    if (msg.type === 'event') {
      if (msg.command === 'stopped') {
        const session = this.sessions.get(sessionId);
        if (session) session.stopped = true;
        this.emit('dap:stopped', { sessionId, reason: (msg.body as { reason?: string })?.reason });
      }
      if (msg.command === 'continued') {
        const session = this.sessions.get(sessionId);
        if (session) session.stopped = false;
        this.emit('dap:continued', { sessionId });
      }
      if (msg.command === 'breakpoint') {
        this.emit('dap:breakpoint', { sessionId, body: msg.body });
      }
    }
    if (msg.type === 'response') {
      if (msg.command === 'stackTrace' && msg.success && msg.body) {
        this.emit('dap:stack', { sessionId, stackFrames: (msg.body as { stackFrames?: DAPStackFrame[] }).stackFrames, totalFrames: (msg.body as { totalFrames?: number }).totalFrames });
      }
      if (msg.command === 'scopes' && msg.success && msg.body) {
        this.emit('dap:scopes', { sessionId, scopes: (msg.body as { scopes?: DAPScope[] }).scopes });
      }
    }
  }
}

export function createDAPBridge(): DAPBridge {
  return new DAPBridge();
}
