import { Emitter } from '@ideia/core-contributions';
import { LspClientManager, LspClient, LspConnectionOptions } from './types';

class DefaultLspClient implements LspClient {
  readonly serverId: string;
  private _connected = false;
  private onNotificationEmitter = new Emitter<{ method: string; params: unknown }>();

  get onNotification() { return this.onNotificationEmitter.event; }
  get connected(): boolean { return this._connected; }

  constructor(serverId: string) {
    this.serverId = serverId;
  }

  async connect(): Promise<void> {
    this._connected = true;
  }

  async request<T>(method: string, params: unknown): Promise<T> {
    if (!this._connected) throw new Error('Not connected');
    return {} as T;
  }

  notify(method: string, params: unknown): void {
    this.onNotificationEmitter.fire({ method, params });
  }

  dispose(): void {
    this._connected = false;
    this.onNotificationEmitter.dispose();
  }
}

export class DefaultLspClientManager implements LspClientManager {
  private clients = new Map<string, DefaultLspClient>();

  async connect(serverId: string, options: LspConnectionOptions): Promise<LspClient> {
    const existing = this.clients.get(serverId);
    if (existing && existing.connected) return existing;

    const client = new DefaultLspClient(serverId);
    await client.connect();
    this.clients.set(serverId, client);
    return client;
  }

  async disconnect(serverId: string): Promise<void> {
    const client = this.clients.get(serverId);
    if (client) {
      client.dispose();
      this.clients.delete(serverId);
    }
  }

  getClient(serverId: string): LspClient | undefined {
    return this.clients.get(serverId);
  }

  async restart(serverId: string): Promise<void> {
    await this.disconnect(serverId);
  }
}
