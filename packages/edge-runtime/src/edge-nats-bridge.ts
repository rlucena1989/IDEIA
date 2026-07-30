import { EventEmitter } from 'events';
import { createLogger } from '@ideia/logger';
import { OfflineQueue, QueuedMessage } from './offline-queue';
const logger = createLogger('edge-nats-bridge');

export interface EdgeNatsBridgeConfig {
  natsUrl: string;
  reconnectIntervalMs: number;
  maxReconnectAttempts: number;
  syncIntervalMs: number;
}

export type BridgeStatus = 'online' | 'offline' | 'connecting' | 'error';

export interface BridgeStatusEvent {
  status: BridgeStatus;
  timestamp: number;
  error?: string;
}

const DEFAULT_CONFIG: EdgeNatsBridgeConfig = {
  natsUrl: 'nats://localhost:4222',
  reconnectIntervalMs: 5000,
  maxReconnectAttempts: 10,
  syncIntervalMs: 30000,
};

export class EdgeNatsBridge {
  private config: EdgeNatsBridgeConfig;
  private status: BridgeStatus = 'offline';
  private reconnectAttempts = 0;
  private emitter: EventEmitter = new EventEmitter();
  private queue: OfflineQueue;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private syncTimer: ReturnType<typeof setInterval> | null = null;
  private destroyed = false;

  constructor(config?: Partial<EdgeNatsBridgeConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.queue = new OfflineQueue({ maxSize: 1000, ttlMs: 86400000 });
  }

  private setStatus(status: BridgeStatus, error?: string): void {
    this.status = status;
    const event: BridgeStatusEvent = { status, timestamp: Date.now(), error };
    this.emitter.emit('status', event);
  }

  async connect(): Promise<void> {
    if (this.destroyed) return;
    this.setStatus('connecting');
    while (this.reconnectAttempts < this.config.maxReconnectAttempts && !this.destroyed) {
      try {
        await this.attemptConnect();
        this.reconnectAttempts = 0;
        this.setStatus('online');
        this.startSync();
        return;
      } catch (err) {
        this.reconnectAttempts++;
        const msg = err instanceof Error ? err.message : String(err);
        this.setStatus('error', msg);
        await this.waitReconnect();
      }
    }
    this.setStatus('offline', 'Max reconnect attempts reached');
  }

  private async attemptConnect(): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('Connection timeout')), 5000);
      try {
        if (!this.config.natsUrl.startsWith('nats://')) {
          clearTimeout(timeout);
          reject(new Error(`Invalid NATS URL: ${this.config.natsUrl}`));
          return;
        }
        clearTimeout(timeout);
        resolve();
      } catch (err) {
        clearTimeout(timeout);
        reject(err);
      }
    });
  }

  private waitReconnect(): Promise<void> {
    return new Promise<void>(resolve => {
      this.reconnectTimer = setTimeout(() => resolve(), this.config.reconnectIntervalMs);
    });
  }

  private startSync(): void {
    this.stopSync();
    this.syncTimer = setInterval(() => {
      this.flush();
    }, this.config.syncIntervalMs);
  }

  private stopSync(): void {
    if (this.syncTimer !== null) {
      clearInterval(this.syncTimer);
      this.syncTimer = null;
    }
  }

  async disconnect(): Promise<void> {
    this.destroyed = true;
    if (this.reconnectTimer !== null) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    this.stopSync();
    this.setStatus('offline');
  }

  isOnline(): boolean {
    return this.status === 'online';
  }

  getStatus(): BridgeStatus {
    return this.status;
  }

  getQueuedMessageCount(): number {
    return this.queue.getCount();
  }

  getQueuedMessages(): QueuedMessage[] {
    return this.queue.getAll();
  }

  async publish(topic: string, payload: unknown): Promise<boolean> {
    if (this.isOnline()) {
      try {
        await this.sendToNats(topic, payload);
        return true;
      } catch {
        this.queue.enqueue(topic, payload);
        return false;
      }
    }
    this.queue.enqueue(topic, payload);
    return false;
  }

  private async sendToNats(topic: string, _payload: unknown): Promise<void> {
    if (!topic) throw new Error('Topic is required');
    return Promise.resolve();
  }

  async flush(): Promise<number> {
    if (!this.isOnline()) return 0;
    const messages = this.queue.getAll();
    let sent = 0;
    for (const msg of messages) {
      try {
        await this.sendToNats(msg.topic, msg.payload);
        this.queue.remove(msg.id);
        sent++;
      } catch {
        break;
      }
    }
    return sent;
  }

  onStatus(handler: (event: BridgeStatusEvent) => void): () => void {
    this.emitter.on('status', handler);
    return () => { this.emitter.off('status', handler); };
  }
}
