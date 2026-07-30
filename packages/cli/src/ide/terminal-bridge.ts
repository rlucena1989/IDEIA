import { spawn, ChildProcess, execFile } from 'node:child_process';
import { EventEmitter } from 'node:events';
import _path from 'node:path';
import { createLogger } from '@ideia/logger';

const log = createLogger('terminal-bridge');

export interface TerminalResult {
  ok: boolean;
  output: string;
  error: string;
  code: number | null;
  durationMs: number;
}

export interface TerminalSession {
  id: string;
  cwd: string;
  process: ChildProcess | null;
  buffer: string;
  startedAt: string;
}

export interface PtySession {
  id: string;
  cwd: string;
  process: import('node-pty').IPty | null;
  startedAt: string;
}

const INJECTION_PATTERNS = [
  /;/,
  /&&/,
  /\|{2,}/,
  /`[^`]*`/,
  /$\(/,
];

const BLOCKED_COMMANDS = [
  /^rm\s+-rf\s+\/$/,
  /^rm\s+-rf\s+\/\*/,
  /^rm\s+-rf\s+--no-preserve-root/,
  /^dd\s+/,
  /^format\s+/,
  /^mkfs\s+/,
  /^:(){ :|:& };:/,
  /^chmod\s+777\s+\//,
  /^mv\s+\/\s+/,
  /^>\/dev\/sda/,
  /^wget\s+.*\||^curl\s+.*\|/,
  /^del\s+\/f\s+\/s\s+/,
  /^rd\s+\/s\s+\/q\s+/,
  /^diskpart\s+/,
  /^format\s+[a-z]:\s*\/q/,
  /^reg\s+delete\s+/,
  /^cipher\s+\/w/,
  /^bcdedit\s+/,
];

const HIGH_RISK_PATTERNS = [
  /^rm\s+-rf/,
  /^sudo/,
  /^del\s+\/f/,
  /^rd\s+\/s/,
  /^shutdown/,
  /^reboot/,
  /^init\s+0/,
  /^kill\s+-9/,
  /^pkexec/,
];

export class TerminalBridge extends EventEmitter {
  private cwd: string;
  private sessions = new Map<string, TerminalSession>();
  private ptySessions = new Map<string, PtySession>();
  private history: { command: string; result: TerminalResult }[] = [];
  private readonly maxHistory = 100;

  constructor(cwd: string) {
    super();
    this.cwd = cwd;
  }

  setCwd(dir: string): void {
    this.cwd = dir;
  }

  classifyCommand(command: string): 'safe' | 'high-risk' | 'blocked' {
    const trimmed = command.trim();
    for (const pattern of BLOCKED_COMMANDS) {
      if (pattern.test(trimmed)) return 'blocked';
    }
    for (const pattern of INJECTION_PATTERNS) {
      if (pattern.test(trimmed)) return 'high-risk';
    }
    for (const pattern of HIGH_RISK_PATTERNS) {
      if (pattern.test(trimmed)) return 'high-risk';
    }
    return 'safe';
  }

  async execute(command: string, timeoutMs = 30000): Promise<TerminalResult> {
    const start = Date.now();
    const classification = this.classifyCommand(command);

    if (classification === 'blocked') {
      const result: TerminalResult = {
        ok: false, output: '', error: `Command blocked by security policy: ${command}`,
        code: null, durationMs: Date.now() - start,
      };
      this.emit('execution', { command, result, classification });
      return result;
    }

    const [cmd, ...args] = parseCommand(command);
    const maxBufferBytes = 10 * 1024 * 1024;

    return new Promise((resolve) => {
      const child = spawn(cmd, args, {
        cwd: this.cwd, shell: false, stdio: ['pipe', 'pipe', 'pipe'],
        timeout: timeoutMs, env: { ...process.env, TERM: 'xterm-256color' },
        windowsHide: true,
      });

      let output = '', error = '';
      child.stdout?.on('data', (data: Buffer) => {
        if (output.length < maxBufferBytes) output += data.toString();
      });
      child.stderr?.on('data', (data: Buffer) => {
        if (error.length < maxBufferBytes) error += data.toString();
      });
      child.on('close', (code) => {
        const result: TerminalResult = {
          ok: code === 0, output, error, code, durationMs: Date.now() - start,
        };
        this.history.push({ command, result });
        if (this.history.length > this.maxHistory) this.history = this.history.slice(-this.maxHistory);
        this.emit('execution', { command, result, classification });
        resolve(result);
      });
      child.on('error', (err) => {
        log.error('Spawn failed', { command: cmd, error: err.message });
        resolve({ ok: false, output, error: err.message, code: null, durationMs: Date.now() - start });
      });
    });
  }

  async executeHighRisk(command: string, approved: boolean, timeoutMs = 30000): Promise<TerminalResult> {
    if (!approved) {
      return { ok: false, output: '', error: 'High-risk command requires explicit approval.', code: null, durationMs: 0 };
    }
    return this.execute(command, timeoutMs);
  }

  openPty(id: string, cwd?: string): PtySession | null {
    try {
      const pty = require('node-pty') as typeof import('node-pty');
      const shell = process.platform === 'win32' ? 'powershell.exe' : (process.env.SHELL || 'bash');
      const proc = pty.spawn(shell, [], {
        name: 'xterm-256color',
        cwd: cwd || this.cwd,
        env: process.env as Record<string, string>,
      });
      const session: PtySession = { id, cwd: cwd || this.cwd, process: proc, startedAt: new Date().toISOString() };
      this.ptySessions.set(id, session);
      return session;
    } catch (err) {
      log.error('Failed to open PTY', { id, error: String(err) });
      return null;
    }
  }

  writePty(id: string, data: string): void {
    const session = this.ptySessions.get(id);
    if (session?.process) {
      session.process.write(data);
    }
  }

  resizePty(id: string, cols: number, rows: number): void {
    const session = this.ptySessions.get(id);
    if (session?.process) {
      session.process.resize(cols, rows);
    }
  }

  closePty(id: string): void {
    const session = this.ptySessions.get(id);
    if (session?.process) {
      session.process.kill();
      this.ptySessions.delete(id);
    }
  }

  closeAllPty(): void {
    for (const [id] of this.ptySessions) this.closePty(id);
  }

  getHistory(): { command: string; result: TerminalResult }[] {
    return [...this.history];
  }

  clearHistory(): void {
    this.history = [];
  }

  getCwd(): string {
    return this.cwd;
  }

  isWindows(): boolean {
    return process.platform === 'win32';
  }
}

function parseCommand(command: string): [string, ...string[]] {
  const parts = command.match(/(?:[^\s"]+|"[^"]*")+/g) || [command];
  const cmd = (parts[0] || '').replace(/"/g, '');
  const args = parts.slice(1).map(a => a.replace(/"/g, ''));
  return [cmd, ...args];
}
