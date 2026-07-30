import { CLIAdapter } from './cli-adapter';
import { createLogger } from '@ideia/logger';
import { Command } from 'commander';
import type { TransportRequest, TransportResponse} from './transport-types';
import type { CommandHandler } from '../types/cli-result';
const logger = createLogger('remote-adapter');

export interface RemoteAdapterConfig {
  baseUrl: string;
  apiKey?: string;
  timeoutMs?: number;
  fallbackToLocal?: boolean;
}

export class RemoteAdapter {
  private localAdapter: CLIAdapter;
  private config: RemoteAdapterConfig;
  private serverAvailable: boolean | null = null;

  constructor(program: Command, config: RemoteAdapterConfig) {
    this.localAdapter = new CLIAdapter(program);
    this.config = {
      timeoutMs: 10000,
      fallbackToLocal: true,
      ...config,
    };
  }

  register(name: string, handler: CommandHandler): void {
    this.localAdapter.register(name, handler);
  }

  async handle(argv: string[]): Promise<TransportResponse> {
    const isServerUp = await this.checkServer();
    if (isServerUp) {
      try {
        return await this.executeRemote(argv);
      } catch (err) {
        if (this.config.fallbackToLocal) {
          return this.localAdapter.handle(argv);
        }
        throw err;
      }
    }

    if (this.config.fallbackToLocal) {
      return this.localAdapter.handle(argv);
    }

    return {
      ok: false,
      code: 1,
      message: 'Remote server is not available',
      error: { message: 'Server offline and fallbackToLocal is disabled' },
    };
  }

  async executeCommand(name: string, args: string[] = []): Promise<TransportResponse> {
    const isServerUp = await this.checkServer();
    if (isServerUp) {
      try {
        return await this.remoteExecute(name, args);
      } catch {
        if (this.config.fallbackToLocal) {
          return this.localHandler(name, args);
        }
        throw new Error('Remote execution failed');
      }
    }

    if (this.config.fallbackToLocal) {
      return this.localHandler(name, args);
    }

    return {
      ok: false,
      code: 1,
      message: 'Remote server is not available',
      error: { message: 'Server offline and fallbackToLocal is disabled' },
    };
  }

  async getStatus(): Promise<TransportResponse> {
    const isServerUp = await this.checkServer();
    if (!isServerUp) {
      return {
        ok: false,
        code: 1,
        message: 'Remote server is offline',
        error: { message: 'Server not reachable' },
      };
    }

    try {
      const response = await fetch(`${this.config.baseUrl}/status`, {
        method: 'GET',
        headers: this.getHeaders(),
        signal: AbortSignal.timeout(this.config.timeoutMs as number),
      });

      if (!response.ok) {
        return {
          ok: false,
          code: response.status,
          message: `Server returned status ${response.status}`,
          error: { message: await response.text() },
        };
      }

      const data = await response.json() as { status: string; version?: string };
      return {
        ok: true,
        code: 0,
        message: `Server is ${data.status}`,
        data: { status: data.status, version: data.version },
      };
    } catch (err) {
      return {
        ok: false,
        code: 1,
        message: 'Failed to get server status',
        error: { message: err instanceof Error ? err.message : String(err) },
      };
    }
  }

  async executePlan(plan: { steps: Array<{ action: string; params: Record<string, unknown> }> }): Promise<TransportResponse> {
    const isServerUp = await this.checkServer();
    if (!isServerUp) {
      if (this.config.fallbackToLocal) {
        const results: Array<{ step: number; result: TransportResponse }> = [];
        for (let i = 0; i < plan.steps.length; i++) {
          const step = plan.steps[i];
          const result = await this.localHandler(step.action, Object.values(step.params).map(String));
          results.push({ step: i, result });
        }
        return {
          ok: results.every(r => r.result.ok),
          code: results.some(r => !r.result.ok) ? 1 : 0,
          message: `Executed ${plan.steps.length} steps locally`,
          data: results,
        };
      }
      return {
        ok: false,
        code: 1,
        message: 'Remote server is not available for plan execution',
        error: { message: 'Server offline and fallbackToLocal is disabled' },
      };
    }

    try {
      const response = await fetch(`${this.config.baseUrl}/execute-plan`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(plan),
        signal: AbortSignal.timeout((this.config.timeoutMs as number) * plan.steps.length),
      });

      if (!response.ok) {
        return {
          ok: false,
          code: response.status,
          message: `Plan execution failed with status ${response.status}`,
          error: { message: await response.text() },
        };
      }

      const data = await response.json() as { results: unknown[] };
      return {
        ok: true,
        code: 0,
        message: `Plan executed successfully (${plan.steps.length} steps)`,
        data: data.results,
      };
    } catch (err) {
      if (this.config.fallbackToLocal) {
        return this.localAdapter.handle([]);
      }
      throw err;
    }
  }

  async checkServer(): Promise<boolean> {
    if (this.serverAvailable !== null) {
      return this.serverAvailable;
    }

    try {
      const response = await fetch(`${this.config.baseUrl}/health`, {
        method: 'GET',
        signal: AbortSignal.timeout(3000),
      });
      this.serverAvailable = response.ok;
      return this.serverAvailable;
    } catch {
      this.serverAvailable = false;
      return false;
    }
  }

  resetServerCheck(): void {
    this.serverAvailable = null;
  }

  private async executeRemote(argv: string[]): Promise<TransportResponse> {
    const request = this.buildRequest(argv);
    const response = await fetch(`${this.config.baseUrl}/execute`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(request),
      signal: AbortSignal.timeout(this.config.timeoutMs as number),
    });

    if (!response.ok) {
      return {
        ok: false,
        code: response.status,
        message: `Remote execution failed: ${response.statusText}`,
        error: { message: await response.text() },
      };
    }

    return await response.json() as TransportResponse;
  }

  private async remoteExecute(name: string, args: string[]): Promise<TransportResponse> {
    const request: TransportRequest = {
      command: name,
      args,
      flags: {},
      rawArgv: ['node', 'ideia', name, ...args],
      cwd: process.cwd(),
    };

    const response = await fetch(`${this.config.baseUrl}/execute`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(request),
      signal: AbortSignal.timeout(this.config.timeoutMs as number),
    });

    if (!response.ok) {
      return {
        ok: false,
        code: response.status,
        message: `Remote command failed: ${response.statusText}`,
        error: { message: await response.text() },
      };
    }

    return await response.json() as TransportResponse;
  }

  private async localHandler(name: string, args: string[]): Promise<TransportResponse> {
    const fakeArgv = ['node', 'ideia', name, ...args];
    return this.localAdapter.handle(fakeArgv);
  }

  private buildRequest(argv: string[]): TransportRequest {
    const nodeIndex = argv[0]?.endsWith('node') ? 1 : 0;
    const cmdIndex = nodeIndex + 1;
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

  private getHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (this.config.apiKey) {
      headers['Authorization'] = `Bearer ${this.config.apiKey}`;
    }
    return headers;
  }
}
