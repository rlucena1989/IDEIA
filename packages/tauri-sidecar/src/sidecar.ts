import { EventEmitter } from 'events';
import { createLogger } from '@ideia/logger';
import { v4 as uuid } from 'uuid';
import { SidecarIPC, IPCRequest, IPCResponse } from './ipc-protocol';
import { HealthCheck, HealthStatus } from './health-check';
const logger = createLogger('sidecar');

export interface TauriSidecarConfig {
  startupTimeout: number;
  maxRestarts: number;
  heartbeatInterval: number;
}

export interface TauriSidecarStreams {
  stdin?: NodeJS.ReadableStream;
  stdout?: NodeJS.WritableStream;
  stderr?: NodeJS.WritableStream;
}

export class TauriSidecar extends EventEmitter {
  private ipc: SidecarIPC;
  private healthCheck: HealthCheck;
  private config: TauriSidecarConfig;

  constructor(config?: Partial<TauriSidecarConfig>, streams?: TauriSidecarStreams) {
    super();
    this.config = {
      startupTimeout: 10000,
      maxRestarts: 3,
      heartbeatInterval: 15000,
      ...config,
    };
    this.ipc = new SidecarIPC(streams?.stdin, streams?.stdout, streams?.stderr);
    this.healthCheck = new HealthCheck();
    this.setupListeners();
  }

  private setupListeners(): void {
    this.ipc.onMessage((msg: IPCResponse) => {
      if (msg.method === 'heartbeat') {
        this.healthCheck.recordHeartbeat();
      }
    });
  }

  async start(): Promise<void> {
    this.ipc.connect();
    this.healthCheck.start(this.config.heartbeatInterval);
  }

  async stop(): Promise<void> {
    this.healthCheck.stop();
    this.ipc.disconnect();
  }

  async invoke(method: string, params?: unknown): Promise<unknown> {
    const request: IPCRequest = {
      id: uuid(),
      method,
      params: params ?? {},
      timestamp: Date.now(),
    };
    const response = await this.ipc.send(request);
    if (response.error) {
      throw new Error(response.error.message);
    }
    return response.result;
  }

  getStatus(): HealthStatus {
    return this.healthCheck.getStatus();
  }

  async restart(): Promise<void> {
    if (this.healthCheck.restartCount >= this.config.maxRestarts) {
      throw new Error(`Max restarts (${this.config.maxRestarts}) exceeded`);
    }
    this.emit('restarting');
    await this.stop();
    this.healthCheck.incrementRestartCount();
    await this.start();
  }

  isRunning(): boolean {
    return this.ipc.isConnected && this.healthCheck.getStatus().status !== 'down';
  }
}
