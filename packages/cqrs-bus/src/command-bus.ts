import { randomUUID } from 'crypto';
import { createLogger } from '@ideia/logger';
import { Command, CommandResult } from './types';
const logger = createLogger('command-bus');

export { Command, CommandResult } from './types';

export class CommandBus {
  private _handlers: Map<string, (cmd: Command) => Promise<CommandResult>> = new Map();
  private _dedupSet: Set<string> = new Set();
  private _defaultTimeout: number;

  constructor(options?: { defaultTimeout?: number }) {
    this._defaultTimeout = options?.defaultTimeout ?? 30000;
  }

  registerHandler(commandType: string, handler: (cmd: Command) => Promise<CommandResult>): void {
    this._handlers.set(commandType, handler);
  }

  async dispatch(command: Command): Promise<CommandResult> {
    const start = Date.now();
    const validated = this._validate(command);

    try {
      const handler = this._handlers.get(validated.type);
      if (handler) {
        return await handler(validated);
      }

      return {
        success: true,
        commandId: validated.id,
        events: [],
        latencyMs: Date.now() - start,
      };
    } catch (error) {
      return {
        success: false,
        commandId: validated.id,
        events: [],
        error: String(error),
        latencyMs: Date.now() - start,
      };
    }
  }

  async dispatchWithDedup(command: Command): Promise<CommandResult> {
    const dedupKey = 'dedup:' + command.metadata.correlationId;
    if (this._dedupSet.has(dedupKey)) {
      return { success: true, commandId: command.id, events: [], latencyMs: 0 };
    }
    this._dedupSet.add(dedupKey);
    setTimeout(() => this._dedupSet.delete(dedupKey), 3600000);
    return this.dispatch(command);
  }

  async dispatchBatch(commands: Command[]): Promise<CommandResult[]> {
    return Promise.all(commands.map(cmd => this.dispatch(cmd)));
  }

  async dispatchWithRetry(command: Command, maxRetries: number = 3, baseDelay: number = 1000): Promise<CommandResult> {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      const result = await this.dispatch({
        ...command,
        metadata: { ...command.metadata, retryCount: attempt },
      });
      if (result.success) return result;
      if (attempt < maxRetries) {
        await new Promise(r => setTimeout(r, baseDelay * Math.pow(2, attempt - 1)));
      }
    }
    return this.dispatch(command);
  }

  private _validate<T extends Command>(cmd: T): T {
    if (!cmd.id) cmd.id = randomUUID();
    if (!cmd.type) throw new Error('Command type is required');
    if (!cmd.aggregateId) throw new Error('Command aggregateId is required');
    if (!cmd.metadata) {
      cmd.metadata = { agentId: 'system', timestamp: Date.now(), correlationId: randomUUID() };
    }
    if (!cmd.metadata.correlationId) cmd.metadata.correlationId = randomUUID();
    return cmd;
  }
}

export interface IKvEntry {
  value: Uint8Array;
}

export interface IKvStore {
  get(key: string): Promise<IKvEntry | null>;
  set(key: string, value: unknown): Promise<void>;
  put(key: string, value: Uint8Array, options?: { ttl?: number }): Promise<void>;
  delete(key: string): Promise<void>;
}

export interface IMessageBus {
  publish(event: unknown): Promise<void>;
  subscribe(handler: (event: unknown) => void): void;
}
