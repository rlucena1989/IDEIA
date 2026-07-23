import { randomUUID } from 'crypto';
import { connect, type NatsConnection, type JetStreamClient, type JetStreamManager, StringCodec, StorageType, AckPolicy, ReplayPolicy, DeliverPolicy, type ConsumerConfig } from 'nats';
import { AuditTrail } from '@ideia/audit-trail';
import { Contract, BusEventSchema } from '@ideia/contracts';
import { createLogger } from '@ideia/logger';
import { BusEvent, EventHandler, EventType, IEventBus, EventEmitInput } from './types';

export interface NatsEventBusConfig {
  servers?: string | string[];
  streamName?: string;
  maxHistory?: number;
  auditTrail?: AuditTrail;
  logger?: Logger;
  reconnect?: boolean;
  maxReconnectAttempts?: number;
}

export interface ReplayOptions {
  eventType?: string;
  fromSeq?: number;
  fromTimestamp?: string;
  maxEvents?: number;
}

export interface StoredEvent {
  seq: number;
  event: BusEvent;
  timestamp: string;
}

export interface Logger {
  warn(message: string, ...args: unknown[]): void;
  error(message: string, ...args: unknown[]): void;
  info(message: string, ...args: unknown[]): void;
}

const DEFAULT_STREAM = 'ideia_events';

export class NatsEventBus implements IEventBus {
  private nc: NatsConnection | null = null;
  private js: JetStreamClient | null = null;
  private jsm: JetStreamManager | null = null;
  private subs: Map<string, { unsubscribe: () => void }> = new Map();
  private stored: StoredEvent[] = [];
  private maxHistory: number;
  private streamName: string;
  private logger: Logger;
  private auditTrail?: AuditTrail;
  private connected = false;
  private seqCounter = 0;
  private sc = StringCodec();
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(private config: NatsEventBusConfig = {}) {
    this.maxHistory = config.maxHistory ?? 10000;
    this.streamName = config.streamName ?? DEFAULT_STREAM;
    this.logger = config.logger ?? createLogger('nats-event-bus');
    this.auditTrail = config.auditTrail;
  }

  get isConnected(): boolean { return this.connected; }

  async connect(): Promise<void> {
    if (this.connected) return;
    const servers = this.config.servers ?? 'nats://localhost:4222';
    try {
      this.nc = await connect({
        servers,
        name: 'ideia-event-bus',
        reconnect: this.config.reconnect ?? true,
        maxReconnectAttempts: this.config.maxReconnectAttempts ?? 10,
        reconnectTimeWait: 2000,
      });
      this.js = this.nc.jetstream();
      try { this.jsm = await this.nc.jetstreamManager(); } catch { this.jsm = null; }
      await this.ensureStream();
      this.connected = true;
      this.logger.info(`[NatsEventBus] Connected to NATS at ${servers}`);
      this.setupReconnectHandler();
    } catch (_err) {
      this.connected = false;
      this.logger.warn(`[NatsEventBus] NATS unavailable, using in-memory storage: ${err}`);
    }
  }

  private setupReconnectHandler(): void {
    const nc = this.nc;
    if (!nc) return;
    void (async () => {
      try {
        for await (const status of nc.status()) {
          if (status.type === 'reconnect') {
            this.logger.info('[NatsEventBus] Reconnected to NATS');
            try { this.jsm = await nc.jetstreamManager(); } catch { this.jsm = null; }
            await this.ensureStream();
          } else if (status.type === 'disconnect') {
            this.logger.warn('[NatsEventBus] Disconnected from NATS');
          }
        }
      } catch {
        this.logger.warn('[NatsEventBus] Status listener stopped');
      }
    })();
  }

  private async ensureStream(): Promise<void> {
    if (!this.nc) return;
    try {
      const jsm: JetStreamManager = await this.nc.jetstreamManager();
      const streams = await jsm.streams.list().next();
      const exists = streams && Array.isArray(streams) ? streams.some((s: { config: { name: string } }) => s.config.name === this.streamName) : false;
      if (!exists) {
        await jsm.streams.add({
          name: this.streamName,
          subjects: [`${this.streamName}.>`],
          storage: StorageType.File,
          max_age: 24 * 60 * 60 * 1_000_000_000,
          max_bytes: 1024 * 1024 * 1024,
          max_msgs: 100_000,
        });
        this.logger.info(`[NatsEventBus] Created JetStream stream: ${this.streamName}`);
      }
    } catch (_err) {
      this.logger.warn(`[NatsEventBus] JetStream unavailable, using in-memory fallback: ${err}`);
    }
  }

  async subscribe(eventType: string, handler: EventHandler, once = false): Promise<string> {
    const id = randomUUID();
    const subject = `${this.streamName}.${eventType}`;
    if (this.js && this.connected) {
      try {
        const consumerConfig: Partial<ConsumerConfig> = {
          ack_policy: once ? AckPolicy.None : AckPolicy.Explicit,
          max_deliver: once ? 1 : 3,
          ack_wait: 30_000_000_000,
          replay_policy: ReplayPolicy.Instant,
        };
        const sub = await this.js.subscribe(subject, { config: consumerConfig as ConsumerConfig });
        let cancelled = false;
        void (async () => {
          for await (const msg of sub) {
            if (cancelled) break;
            try {
              const data = this.sc.decode(msg.data);
              const parsed = JSON.parse(data) as BusEvent;
              await handler(parsed);
              if (once) break;
            } catch (_e) {
              this.logger.error(`[NatsEventBus] Handler error: ${String(e)}`);
            }
          }
        })();
        this.subs.set(id, {
          unsubscribe: () => { cancelled = true; sub.unsubscribe(); this.subs.delete(id); },
        });
        return id;
      } catch (_err) {
        this.logger.warn(`[NatsEventBus] JetStream subscribe failed for ${subject}, using core NATS: ${err}`);
      }
    }
    if (this.nc) {
      try {
        const sub = this.nc.subscribe(subject);
        let cancelled = false;
        void (async () => {
          for await (const msg of sub) {
            if (cancelled) break;
            try {
              const data = this.sc.decode(msg.data);
              const parsed = JSON.parse(data) as BusEvent;
              handler(parsed);
              if (once) break;
            } catch (_e) {
              this.logger.error(`[NatsEventBus] Handler error: ${String(e)}`);
            }
          }
        })();
        this.subs.set(id, {
          unsubscribe: () => { cancelled = true; sub.unsubscribe(); this.subs.delete(id); },
        });
        return id;
      } catch (_err) {
        this.logger.warn(`[NatsEventBus] Subscribe failed for ${subject}, using fallback: ${err}`);
      }
    }
    this.subs.set(id, { unsubscribe: () => { this.subs.delete(id); } });
    return id;
  }

  async subscribeOnce(eventType: EventType | '*', handler: EventHandler): Promise<string> {
    return this.subscribe(eventType, handler, true);
  }

  async unsubscribe(id: string): Promise<boolean> {
    const sub = this.subs.get(id);
    if (sub) { sub.unsubscribe(); this.subs.delete(id); return true; }
    return false;
  }

  async emit(event: EventEmitInput): Promise<BusEvent> {
    const fullEvent: BusEvent = {
      ...event,
      id: randomUUID(),
      timestamp: new Date().toISOString(),
    };
    const validation = Contract.pre(BusEventSchema, fullEvent);
    if (!validation.success) {
      this.logger.warn(`[NatsEventBus] Schema validation warning: ${validation.error.format()}`);
    }
    const seq = ++this.seqCounter;
    const stored: StoredEvent = { seq, event: fullEvent, timestamp: fullEvent.timestamp };
    this.stored.push(stored);
    if (this.stored.length > this.maxHistory) this.stored.shift();
    if (this.auditTrail) {
      try {
        this.auditTrail.append({
          actor: 'system', eventType: event.type, target: event.source,
          decision: 'approved', result: 'success', metadata: { payload: event.payload, seq },
        });
      } catch (_err) {
        this.logger.error(`[NatsEventBus] AuditTrail append error: ${String(err)}`);
      }
    }
    if (this.js && this.connected) {
      try {
        const subject = `${this.streamName}.${event.type}`;
        await this.js.publish(subject, this.sc.encode(JSON.stringify({ ...fullEvent, _seq: seq })), { msgID: fullEvent.id });
      } catch (_err) {
        this.logger.warn(`[NatsEventBus] JetStream publish failed, event stored in-memory: ${err}`);
      }
    }
    return fullEvent;
  }

  async getHistory(eventType?: string): Promise<BusEvent[]> {
    if (eventType) return this.stored.filter(e => e.event.type === eventType).map(e => e.event);
    return this.stored.map(e => e.event);
  }

  async subscriberCount(): Promise<number> { return this.subs.size; }
  async clearHistory(): Promise<void> { this.stored = []; }

  async replayFromSequence(fromSeq: number, options?: ReplayOptions): Promise<BusEvent[]> {
    let events = this.stored.filter(s => s.seq >= fromSeq);
    if (options?.eventType) events = events.filter(e => e.event.type === options.eventType);
    if (options?.maxEvents && events.length > options.maxEvents) events = events.slice(0, options.maxEvents);
    return events.map(e => e.event);
  }

  async replayFromTimestamp(fromTimestamp: string, options?: ReplayOptions): Promise<BusEvent[]> {
    const from = new Date(fromTimestamp).getTime();
    let events = this.stored.filter(s => new Date(s.timestamp).getTime() >= from);
    if (options?.eventType) events = events.filter(e => e.event.type === options.eventType);
    if (options?.maxEvents && events.length > options.maxEvents) events = events.slice(0, options.maxEvents);
    return events.map(e => e.event);
  }

  async replayFromJetStream(options?: { eventType?: string; maxEvents?: number }): Promise<BusEvent[]> {
    if (this.js && this.connected) {
      try {
        const subject = options?.eventType
          ? `${this.streamName}.${options.eventType}`
          : `${this.streamName}.>`;
        const sub = await this.js.subscribe(subject, { config: { deliver_policy: DeliverPolicy.All, ack_policy: AckPolicy.None } as ConsumerConfig });
        const events: BusEvent[] = [];
        for await (const msg of sub) {
          if (options?.maxEvents && events.length >= options.maxEvents) break;
          try {
            const data = this.sc.decode(msg.data);
            const parsed = JSON.parse(data) as BusEvent;
            events.push(parsed);
          } catch (_err) {
            // Log silenciado propositalmente — falha nao bloqueia fluxo
          }
        }
        sub.unsubscribe();
        return events;
      } catch (_err) {
        this.logger.warn(`[NatsEventBus] JetStream replay failed, using in-memory: ${err}`);
      }
    }
    let filtered = options?.eventType
      ? this.stored.filter(s => s.event.type === options.eventType)
      : this.stored;
    if (options?.maxEvents) filtered = filtered.slice(0, options.maxEvents);
    return filtered.map(e => e.event);
  }

  async replayState(options?: ReplayOptions): Promise<Map<string, BusEvent>> {
    const events = options?.fromSeq
      ? await this.replayFromSequence(options.fromSeq, options)
      : await this.getHistory(options?.eventType);
    const state = new Map<string, BusEvent>();
    for (const event of events) {
      if (event.type.endsWith('.created') || event.type.endsWith('.updated')) {
        state.set(`${event.source}:${event.type}`, event);
      } else if (event.type.endsWith('.deleted')) {
        const key = `${event.source}:${event.type.replace('.deleted', '.created')}`;
        state.delete(key);
      }
    }
    return state;
  }

  async disconnect(): Promise<void> {
    if (this.nc) {
      if (!this.nc.isClosed()) { await this.nc.drain(); await this.nc.close(); }
      this.connected = false; this.js = null; this.nc = null;
      this.logger.info('[NatsEventBus] Disconnected');
    }
  }
}

export function createNatsEventBus(config?: NatsEventBusConfig): NatsEventBus {
  return new NatsEventBus(config);
}
