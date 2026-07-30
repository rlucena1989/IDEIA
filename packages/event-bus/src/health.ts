import { NatsConnectionManager } from './nats-connection';
import { createLogger } from '@ideia/logger';
import { NatsStreamManager } from './streams';
import { DeadLetterQueue } from './dlq';
import { ConsumerGroupManager } from './consumers';
import { KVStore } from './kv-store';
import { ObjectStore } from './object-store';
import { RequestReplyManager } from './req-reply';

export interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: number;
  components: {
    connection: ComponentHealth;
    streams: ComponentHealth;
    dlq: ComponentHealth;
    consumers: ComponentHealth;
    kv: ComponentHealth;
    objectStore: ComponentHealth;
    reqReply: ComponentHealth;
  };
}

export interface ComponentHealth {
  status: 'healthy' | 'degraded' | 'unhealthy';
  message?: string;
  details?: Record<string, unknown>;
}

export class HealthCheck {
  private streamManager?: NatsStreamManager;
  private dlq?: DeadLetterQueue;
  private consumerGroupManager?: ConsumerGroupManager;
  private kvStore?: KVStore;
  private objectStore?: ObjectStore;
  private reqReplyManager?: RequestReplyManager;

  constructor(private connectionManager: NatsConnectionManager) {}

  setStreamManager(manager: NatsStreamManager): void { this.streamManager = manager; }
  setDLQ(dlq: DeadLetterQueue): void { this.dlq = dlq; }
  setConsumerGroupManager(manager: ConsumerGroupManager): void { this.consumerGroupManager = manager; }
  setKVStore(store: KVStore): void { this.kvStore = store; }
  setObjectStore(store: ObjectStore): void { this.objectStore = store; }
  setRequestReplyManager(manager: RequestReplyManager): void { this.reqReplyManager = manager; }

  async check(): Promise<HealthStatus> {
    const [connection, streams, dlq, consumers, kv, objectStore, reqReply] = await Promise.all([
      this.checkConnection(),
      this.checkStreams(),
      this.checkDLQ(),
      this.checkConsumers(),
      this.checkKV(),
      this.checkObjectStore(),
      this.checkReqReply(),
    ]);

    const components = { connection, streams, dlq, consumers, kv, objectStore, reqReply };
    const status = this.calculateOverallStatus(components);

    return { status, timestamp: Date.now(), components };
  }

  private async checkConnection(): Promise<ComponentHealth> {
    try {
      const connected = await this.connectionManager.isConnected();
      return connected
        ? { status: 'healthy', message: 'Connected' }
        : { status: 'degraded', message: 'Not connected' };
    } catch (_err) {
      return { status: 'unhealthy', message: String(_err) };
    }
  }

  private async checkStreams(): Promise<ComponentHealth> {
    try {
      if (!this.streamManager) return { status: 'healthy', message: 'Not configured' };
      const streams = await this.streamManager.listStreams();
      return { status: 'healthy', message: `${streams.length} streams active` };
    } catch (_err) {
      return { status: 'unhealthy', message: String(_err) };
    }
  }

  private async checkDLQ(): Promise<ComponentHealth> {
    try {
      if (!this.dlq) return { status: 'healthy', message: 'Not configured' };
      const stats = await this.dlq.getStats();
      return { status: 'healthy', details: stats };
    } catch (_err) {
      return { status: 'unhealthy', message: String(_err) };
    }
  }

  private async checkConsumers(): Promise<ComponentHealth> {
    try {
      if (!this.consumerGroupManager) return { status: 'healthy', message: 'Not configured' };
      const groups = this.consumerGroupManager.listGroups();
      return { status: 'healthy', message: `${groups.length} consumer groups` };
    } catch (_err) {
      return { status: 'unhealthy', message: String(_err) };
    }
  }

  private async checkKV(): Promise<ComponentHealth> {
    try {
      if (!this.kvStore) return { status: 'healthy', message: 'Not configured' };
      const stats = await this.kvStore.getStats();
      return { status: 'healthy', details: stats };
    } catch (_err) {
      return { status: 'unhealthy', message: String(_err) };
    }
  }

  private async checkObjectStore(): Promise<ComponentHealth> {
    try {
      if (!this.objectStore) return { status: 'healthy', message: 'Not configured' };
      const stats = await this.objectStore.getStats();
      return { status: 'healthy', details: stats };
    } catch (_err) {
      return { status: 'unhealthy', message: String(_err) };
    }
  }

  private async checkReqReply(): Promise<ComponentHealth> {
    try {
      if (!this.reqReplyManager) return { status: 'healthy', message: 'Not configured' };
      const handlers = this.reqReplyManager.getRegisteredHandlers();
      return { status: 'healthy', message: `${handlers.length} handlers registered` };
    } catch (_err) {
      return { status: 'unhealthy', message: String(_err) };
    }
  }

  private calculateOverallStatus(components: HealthStatus['components']): HealthStatus['status'] {
    const allHealthy = Object.values(components).every(c => c.status === 'healthy');
    const hasUnhealthy = Object.values(components).some(c => c.status === 'unhealthy');
    if (hasUnhealthy) return 'unhealthy';
    if (!allHealthy) return 'degraded';
    return 'healthy';
  }
}

export function createHealthCheck(connectionManager: NatsConnectionManager): HealthCheck {
  return new HealthCheck(connectionManager);
}
