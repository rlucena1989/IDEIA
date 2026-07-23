export type SandboxAction = 'allow' | 'block' | 'warn';

export interface SandboxRule {
  pattern: RegExp;
  action: SandboxAction;
  reason: string;
  category: string;
}

export interface CommandRequest {
  command: string;
  args?: string[];
  cwd?: string;
  timeout?: number;
  sessionId?: string;
}

export interface CommandResult {
  allowed: boolean;
  blocked: boolean;
  reason?: string;
  stdout?: string;
  stderr?: string;
  exitCode?: number;
  duration?: number;
  rulesMatched: string[];
}

export interface SessionConfig {
  allowList: string[];
  blockList: string[];
  defaultTimeout: number;
  maxConcurrency: number;
}
