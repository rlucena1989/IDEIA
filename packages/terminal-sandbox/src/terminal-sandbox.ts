import { execFileSync } from 'child_process';
import { CommandRequest, CommandResult, SandboxRule } from './types';
import { createLogger } from '@ideia/logger';

const _log = createLogger('terminal-sandbox');

const DEFAULT_RULES: SandboxRule[] = [
  { pattern: /^rm\s+-rf\s+\/$/, action: 'block', reason: 'Destructive root deletion', category: 'destructive' },
  { pattern: /^mkfs/, action: 'block', reason: 'Filesystem creation blocked', category: 'destructive' },
  { pattern: /^dd\s+/, action: 'block', reason: 'Low-level disk write blocked', category: 'destructive' },
  { pattern: /^shutdown/, action: 'block', reason: 'System shutdown blocked', category: 'system' },
  { pattern: /^reboot/, action: 'block', reason: 'System reboot blocked', category: 'system' },
  { pattern: /^sudo/, action: 'warn', reason: 'Sudo requires justification', category: 'privilege' },
  { pattern: /^chmod\s+777/, action: 'warn', reason: 'Overly permissive chmod', category: 'security' },
  { pattern: /^curl.*\|\s*(?:bash|sh)/, action: 'block', reason: 'Piping curl to shell is blocked', category: 'security' },
  { pattern: /^wget.*-O\s*-\s*\|/, action: 'block', reason: 'Piping wget to shell is blocked', category: 'security' },
  { pattern: /^npm\s+publish/, action: 'warn', reason: 'npm publish requires confirmation', category: 'publishing' },
  { pattern: /^git\s+push\s+--force/, action: 'warn', reason: 'Force push is dangerous', category: 'git' },
  { pattern: /^drop\s+(?:table|database)/i, action: 'block', reason: 'Destructive SQL blocked', category: 'database' },
];

export class TerminalSandbox {
  private rules: SandboxRule[];
  private activeSessions: Map<string, number> = new Map();

  constructor(customRules?: SandboxRule[]) {
    this.rules = [...DEFAULT_RULES, ...(customRules || [])];
  }

  check(request: CommandRequest): { allowed: boolean; blocked: boolean; reason?: string; rulesMatched: string[] } {
    const fullCommand = [request.command, ...(request.args || [])].join(' ');
    const rulesMatched: string[] = [];

    for (const rule of this.rules) {
      if (rule.pattern.test(fullCommand)) {
        rulesMatched.push(rule.category);
        if (rule.action === 'block') {
          return { allowed: false, blocked: true, reason: rule.reason, rulesMatched };
        }
      }
    }

    return { allowed: true, blocked: false, rulesMatched: rulesMatched.length > 0 ? rulesMatched : [] };
  }

  execute(request: CommandRequest): CommandResult {
    const check = this.check(request);

    if (!check.allowed) {
      return {
        allowed: false,
        blocked: true,
        reason: check.reason,
        rulesMatched: check.rulesMatched,
      };
    }

    const sessionId = request.sessionId || 'default';
    const currentCount = this.activeSessions.get(sessionId) || 0;
    this.activeSessions.set(sessionId, currentCount + 1);

    const timeout = request.timeout || 30000;
    const cmd = request.command;
    const args = request.args || [];

    try {
      const start = Date.now();
      const stdout = String(execFileSync(cmd, args, {
        timeout,
        cwd: request.cwd,
        encoding: 'utf-8' as const,
        maxBuffer: 1024 * 1024,
        windowsHide: true,
      }));
      const duration = Date.now() - start;

      return {
        allowed: true,
        blocked: false,
        stdout,
        exitCode: 0,
        duration,
        rulesMatched: check.rulesMatched,
      };
    } catch (error: unknown) {
      const err = error as { stderr?: string; status?: number; message?: string };
      return {
        allowed: true,
        blocked: false,
        stderr: err.stderr || err.message || 'Unknown error',
        exitCode: err.status || 1,
        rulesMatched: check.rulesMatched,
      };
    } finally {
      const count = this.activeSessions.get(sessionId) || 1;
      this.activeSessions.set(sessionId, Math.max(0, count - 1));
    }
  }

  addRule(rule: SandboxRule): void {
    this.rules.push(rule);
  }

  getRules(): SandboxRule[] {
    return [...this.rules];
  }

  getActiveCount(): number {
    let total = 0;
    for (const count of this.activeSessions.values()) {
      total += count;
    }
    return total;
  }
}

export function createTerminalSandbox(customRules?: SandboxRule[]): TerminalSandbox {
  return new TerminalSandbox(customRules);
}
