import type { CliCommandResult, CommandContext, CommandHandler } from '../types/cli-result';

export function createCommandRunner<T>(handler: CommandHandler<T>) {
  return async (context: CommandContext): Promise<CliCommandResult<T>> => {
    try {
      const result = await handler(context);
      return result;
    } catch (error: unknown) {
      const err = error instanceof Error ? error : new Error(String(error));
      return {
        ok: false,
        code: 1,
        message: err.message,
        error: {
          name: err.name,
          message: err.message,
          details: err,
        },
      };
    }
  };
}

export function buildContext(args: string[], dryRun = false): CommandContext {
  return {
    args,
    cwd: process.cwd(),
    env: { ...process.env },
    dryRun,
  };
}
