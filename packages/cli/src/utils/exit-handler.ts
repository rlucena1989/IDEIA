import { createLogger } from '@ideia/logger';

const logger = createLogger('cli:exit');

export interface ExitOptions {
  json?: boolean;
  verbose?: boolean;
  exitCode?: number;
}

export function exitWithError(context: string, error: unknown, opts?: ExitOptions): never {
  const message = error instanceof Error ? error.message : String(error);
  const stack = error instanceof Error ? error.stack : undefined;

  if (opts?.json) {
    const output = { ok: false, error: message, context, exitCode: opts?.exitCode ?? 1 };
    console.error(JSON.stringify(output, null, 2));
  } else {
    console.error(`Erro em ${context}: ${message}`);
    if (opts?.verbose && stack) {
      console.error(stack);
    }
  }

  logger.error(`CLI error in ${context}`, { message, exitCode: opts?.exitCode ?? 1 });
  process.exit(opts?.exitCode ?? 1);
}

export function captureActionError(context: string, opts?: ExitOptions) {
  return (error: unknown) => {
    exitWithError(context, error, opts);
  };
}
