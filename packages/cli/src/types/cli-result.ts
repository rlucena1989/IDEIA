export interface CliCommandResult<T = unknown> {
  ok: boolean;
  code: number;
  message: string;
  data?: T;
  error?: {
    name?: string;
    message: string;
    details?: unknown;
  };
}

export interface CommandContext {
  args: string[];
  cwd: string;
  env: Record<string, string | undefined>;
  dryRun?: boolean;
}

export interface CommandHandler<T = unknown> {
  (context: CommandContext): Promise<CliCommandResult<T>>;
}

export function success<T>(message: string, data?: T): CliCommandResult<T> {
  return { ok: true, code: 0, message, data };
}

export function failure(message: string, code = 1, details?: unknown): CliCommandResult {
  return {
    ok: false,
    code,
    message,
    error: { message, details },
  };
}
