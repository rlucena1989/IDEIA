import { NatsConnectionManager } from './nats-connection';
import type { JetStreamManager, StreamConfig, ConsumerConfig } from 'nats';
import { StorageType } from 'nats';
import { createLogger } from '@ideia/logger';

const log = createLogger('nats-stream-manager');

export const EVENT_STREAMS = [
  'agent.started', 'agent.completed', 'agent.failed', 'agent.stuck',
  'task.created', 'task.started', 'task.completed', 'task.failed',
  'policy.evaluated', 'policy.violated', 'cycle.completed',
  'feedback.submitted', 'trace.linked', 'workflow.completed',
  'file.change', 'terminal.execution',
] as const;

export type EventStreamType = typeof EVENT_STREAMS[number];

export interface StreamConfigOptions {
  maxAge?: number;
  maxBytes?: number;
  maxMsgs?: number;
}

const DEFAULT_STREAM_CONFIG: StreamConfigOptions = {
  maxAge: 24 * 60 * 60 * 1000,
  maxBytes: 1024 * 1024 * 1024,
  maxMsgs: 100000,
};

export class NatsStreamManager {
  private connectionManager: NatsConnectionManager;
  private streamConfigs: Map<string, StreamConfigOptions> = new Map();
  private inMemoryStreams: Map<string, Array<{ data: unknown; timestamp: number }>> = new Map();
  private jsm: JetStreamManager | null = null;
  private jetstreamEnabled = false;

  constructor(connectionManager: NatsConnectionManager) {
    this.connectionManager = connectionManager;
  }

  async initialize(): Promise<void> {
    try {
      await this.connectionManager.connect();
    } catch (_err) {
      log.info(`Initialized (offline mode): ${err}`);
      return;
    }
    const nc = this.connectionManager.getConnection();

    if (nc) {
      try {
        this.jsm = await nc.jetstreamManager();
        this.jetstreamEnabled = true;
        log.info('JetStream available');
      } catch {
        log.info('JetStream unavailable, using in-memory mode');
      }
    }

    for (const eventType of EVENT_STREAMS) {
      this.inMemoryStreams.set(eventType, []);
      this.streamConfigs.set(eventType, DEFAULT_STREAM_CONFIG);

      if (this.jetstreamEnabled && this.jsm) {
        try {
          await this.jsm.streams.add({
            name: this.toStreamName(eventType),
            subjects: [this.getSubject(eventType)],
            storage: StorageType.File,
            max_age: DEFAULT_STREAM_CONFIG.maxAge! * 1_000_000,
            max_bytes: DEFAULT_STREAM_CONFIG.maxBytes,
            max_msgs: DEFAULT_STREAM_CONFIG.maxMsgs,
          });
        } catch { /* stream may exist */ }
      }
    }

    log.info(`Initialized ${EVENT_STREAMS.length} event streams (${this.jetstreamEnabled ? 'JetStream' : 'in-memory'} mode)`);
  }

  private toStreamName(eventType: string): string {
    return `ideia_${eventType.replace(/\./g, '_')}`;
  }

  async createStream(eventType: string, options: StreamConfigOptions = {}): Promise<void> {
    const config: StreamConfigOptions = { ...DEFAULT_STREAM_CONFIG, ...options };
    this.streamConfigs.set(eventType, config);
    if (!this.inMemoryStreams.has(eventType)) this.inMemoryStreams.set(eventType, []);

    if (this.jetstreamEnabled && this.jsm) {
      try {
        await this.jsm.streams.add({
          name: this.toStreamName(eventType),
          subjects: [this.getSubject(eventType)],
          storage: StorageType.File,
          max_age: ((config.maxAge ?? DEFAULT_STREAM_CONFIG.maxAge) ?? 86400000) * 1_000_000,
          max_bytes: config.maxBytes ?? DEFAULT_STREAM_CONFIG.maxBytes,
          max_msgs: config.maxMsgs ?? DEFAULT_STREAM_CONFIG.maxMsgs,
        } as StreamConfig);
      } catch { /* fall through */ }
    }
    log.info(`Created stream for ${eventType}`);
  }

  async deleteStream(eventType: string): Promise<void> {
    this.inMemoryStreams.delete(eventType);
    this.streamConfigs.delete(eventType);
    if (this.jetstreamEnabled && this.jsm) {
      try { await this.jsm.streams.delete(this.toStreamName(eventType)); } catch { /* ignore */ }
    }
  }

  async getStreamInfo(eventType: string): Promise<StreamConfigOptions | null> {
    return this.streamConfigs.get(eventType) || null;
  }

  async listStreams(): Promise<string[]> {
    if (this.jetstreamEnabled && this.jsm) {
      try {
        const streams: string[] = [];
        for await (const s of this.jsm.streams.list()) { streams.push(s.config.name); }
        return streams;
      } catch { /* fall through */ }
    }
    return Array.from(this.inMemoryStreams.keys());
  }

  async purgeStream(eventType: string): Promise<void> {
    this.inMemoryStreams.set(eventType, []);
    if (this.jetstreamEnabled && this.jsm) {
      try { await this.jsm.streams.purge(this.toStreamName(eventType)); } catch { /* ignore */ }
    }
  }

  getSubject(eventType: string): string {
    return `ideia.events.${eventType}`;
  }

  async publish(eventType: string, data: unknown): Promise<void> {
    const stream = this.inMemoryStreams.get(eventType);
    if (!stream) throw new Error(`Stream ${eventType} not initialized`);
    const now = Date.now();
    stream.push({ data, timestamp: now });

    if (this.jetstreamEnabled && this.connectionManager.getConnection()) {
      try {
        const nc = this.connectionManager.getConnection()!;
        const sc = this.connectionManager.getStringCodec();
        nc.publish(this.getSubject(eventType), sc.encode(JSON.stringify(data)));
      } catch { /* publish failed, in memory */ }
    }

    const config = this.streamConfigs.get(eventType) || DEFAULT_STREAM_CONFIG;
    if (config.maxAge) {
      const cutoff = now - config.maxAge;
      while (stream.length > 0 && stream[0].timestamp < cutoff) stream.shift();
    }
    if (config.maxMsgs && stream.length > config.maxMsgs) {
      stream.splice(0, stream.length - config.maxMsgs);
    }
  }

  async consume(eventType: string): Promise<Array<{ data: unknown; timestamp: number }>> {
    const stream = this.inMemoryStreams.get(eventType);
    if (!stream) throw new Error(`Stream ${eventType} not initialized`);
    return [...stream];
  }

  async createConsumer(eventType: string, consumerName: string): Promise<void> {
    if (this.jetstreamEnabled && this.jsm) {
      try {
        await this.jsm.consumers.add(this.toStreamName(eventType), {
          durable_name: consumerName,
          ack_policy: 'explicit' as const,
          max_deliver: 3,
          ack_wait: 30_000_000_000,
        } as Partial<ConsumerConfig>);
        return;
      } catch { /* fall through */ }
    }
    log.info(`Created consumer ${consumerName} for ${eventType} (in-memory mode)`);
  }

  async deleteConsumer(eventType: string, consumerName: string): Promise<void> {
    if (this.jetstreamEnabled && this.jsm) {
      try { await this.jsm.consumers.delete(this.toStreamName(eventType), consumerName); return; } catch { /* fall through */ }
    }
  }

  async listConsumers(eventType: string): Promise<string[]> {
    if (this.jetstreamEnabled && this.jsm) {
      try {
        const consumers: string[] = [];
        for await (const c of this.jsm.consumers.list(this.toStreamName(eventType))) { consumers.push(c.name); }
        return consumers;
      } catch { /* fall through */ }
    }
    return [];
  }

  getJetstreamStatus(): string {
    return this.jetstreamEnabled ? 'enabled' : 'disabled (in-memory)';
  }
}

export function createNatsStreamManager(connectionManager: NatsConnectionManager): NatsStreamManager {
  return new NatsStreamManager(connectionManager);
}
