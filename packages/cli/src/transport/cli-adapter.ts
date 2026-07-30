import { Command } from 'commander';
import { createLogger } from '@ideia/logger';
import type { TransportRequest, TransportResponse, AdapterConfig } from './transport-types';
import type { CliCommandResult, CommandHandler } from '../types/cli-result';
const logger = createLogger('cli-adapter');

export class CLIAdapter {
  private program: Command;
  private handlers = new Map<string, CommandHandler>();

  constructor(program: Command) {
    this.program = program;
  }

  register(name: string, handler: CommandHandler): void {
    this.handlers.set(name, handler);
  }

  async handle(argv: string[]): Promise<TransportResponse> {
    const config = this.extractConfig(argv);
    const request = this.buildRequest(argv);

    const handler = this.handlers.get(request.command);
    if (!handler) {
      return this.formatResponse({
        ok: false,
        code: 1,
        message: `Unknown command: ${request.command}`,
        error: { message: `No handler registered for ${request.command}` },
      }, config);
    }

    try {
      const result = await handler({ args: request.args, cwd: request.cwd, env: process.env as Record<string, string | undefined>, dryRun: config.dryRun });
      return this.formatResult(result, config);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      return this.formatResponse({
        ok: false,
        code: 1,
        message,
        error: { message, details: err },
      }, config);
    }
  }

  private extractConfig(argv: string[]): AdapterConfig {
    return {
      json: argv.includes('--json'),
      verbose: argv.includes('--verbose'),
      dryRun: argv.includes('--dry-run'),
    };
  }

  private buildRequest(argv: string[]): TransportRequest {
    const nodeIndex = argv[0]?.endsWith('node') ? 1 : 0;
    const scriptIndex = nodeIndex;
    const cmdIndex = scriptIndex + 1;
    const command = argv[cmdIndex] || '';
    const flags: Record<string, unknown> = {};
    const args: string[] = [];

    for (let i = cmdIndex + 1; i < argv.length; i++) {
      const arg = argv[i];
      if (arg && arg.startsWith('--')) {
        const eqIndex = arg.indexOf('=');
        if (eqIndex > -1) {
          const key = arg.slice(2, eqIndex);
          const value = arg.slice(eqIndex + 1);
          flags[key] = value;
        } else {
          flags[arg.slice(2)] = true;
        }
      } else if (arg) {
        args.push(arg);
      }
    }

    return { command, args, flags, rawArgv: argv, cwd: process.cwd() };
  }

  private formatResult(result: CliCommandResult, config: AdapterConfig): TransportResponse {
    if (config.json) {
      return {
        ok: result.ok,
        code: result.code,
        message: result.message,
        data: result.data,
        error: result.error,
      };
    }
    return {
      ok: result.ok,
      code: result.code,
      message: config.verbose ? result.message : (result.ok ? 'OK' : result.message),
      data: result.ok ? result.data : undefined,
      error: result.error,
    };
  }

  private formatResponse(response: TransportResponse, config: AdapterConfig): TransportResponse {
    if (config.json) return response;
    return response;
  }
}
