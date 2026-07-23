"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NatsEventBus = void 0;
exports.createNatsEventBus = createNatsEventBus;
const crypto_1 = require("crypto");
const nats_1 = require("nats");
const contracts_1 = require("@ideia/contracts");
const logger_1 = require("@ideia/logger");
const DEFAULT_STREAM = 'ideia_events';
class NatsEventBus {
    config;
    nc = null;
    js = null;
    subs = new Map();
    stored = [];
    maxHistory;
    streamName;
    logger;
    auditTrail;
    connected = false;
    seqCounter = 0;
    sc = (0, nats_1.StringCodec)();
    constructor(config = {}) {
        this.config = config;
        this.maxHistory = config.maxHistory ?? 10000;
        this.streamName = config.streamName ?? DEFAULT_STREAM;
        this.logger = config.logger ?? (0, logger_1.createLogger)('nats-event-bus');
        this.auditTrail = config.auditTrail;
    }
    get isConnected() { return this.connected; }
    async connect() {
        if (this.connected)
            return;
        const servers = this.config.servers ?? 'nats://localhost:4222';
        try {
            this.nc = await (0, nats_1.connect)({
                servers,
                name: 'ideia-event-bus',
                reconnect: this.config.reconnect ?? true,
                maxReconnectAttempts: this.config.maxReconnectAttempts ?? 10,
                reconnectTimeWait: 2000,
            });
            this.js = this.nc.jetstream();
            await this.ensureStream();
            this.connected = true;
            this.logger.info(`[NatsEventBus] Connected to NATS at ${servers}`);
        }
        catch (err) {
            const errMsg = err instanceof Error ? err.message : String(err);
            throw new Error(`Failed to connect to NATS: ${errMsg}`);
        }
    }
    async ensureStream() {
        if (!this.nc)
            return;
        try {
            const jsm = await this.nc.jetstreamManager();
            const streams = await jsm.streams.list().next();
            const exists = streams && Array.isArray(streams) ? streams.some((s) => s.config.name === this.streamName) : false;
            if (!exists) {
                await jsm.streams.add({
                    name: this.streamName,
                    subjects: [`${this.streamName}.>`],
                    storage: nats_1.StorageType.File,
                    max_age: 24 * 60 * 60 * 1_000_000_000,
                    max_bytes: 1024 * 1024 * 1024,
                    max_msgs: 100_000,
                });
                this.logger.info(`[NatsEventBus] Created JetStream stream: ${this.streamName}`);
            }
        }
        catch (err) {
            this.logger.warn(`[NatsEventBus] JetStream unavailable, using in-memory fallback: ${err}`);
        }
    }
    async subscribe(eventType, handler, once = false) {
        const id = (0, crypto_1.randomUUID)();
        const subject = `${this.streamName}.${eventType}`;
        if (this.nc) {
            try {
                const sub = this.nc.subscribe(subject);
                let cancelled = false;
                void (async () => {
                    for await (const msg of sub) {
                        if (cancelled)
                            break;
                        try {
                            const data = this.sc.decode(msg.data);
                            const parsed = JSON.parse(data);
                            handler(parsed);
                            if (once)
                                break;
                        }
                        catch (e) {
                            this.logger.error(`[NatsEventBus] Handler error: ${String(e)}`);
                        }
                    }
                })();
                this.subs.set(id, {
                    unsubscribe: () => { cancelled = true; sub.unsubscribe(); this.subs.delete(id); },
                });
                return id;
            }
            catch (err) {
                this.logger.warn(`[NatsEventBus] Subscribe failed for ${subject}, using fallback: ${err}`);
            }
        }
        this.subs.set(id, { unsubscribe: () => { this.subs.delete(id); } });
        return id;
    }
    async subscribeOnce(eventType, handler) {
        return this.subscribe(eventType, handler, true);
    }
    async unsubscribe(id) {
        const sub = this.subs.get(id);
        if (sub) {
            sub.unsubscribe();
            this.subs.delete(id);
            return true;
        }
        return false;
    }
    async emit(event) {
        const fullEvent = {
            ...event,
            id: (0, crypto_1.randomUUID)(),
            timestamp: new Date().toISOString(),
        };
        const validation = contracts_1.Contract.pre(contracts_1.BusEventSchema, fullEvent);
        if (!validation.success) {
            this.logger.warn(`[NatsEventBus] Schema validation warning: ${validation.error.format()}`);
        }
        const seq = ++this.seqCounter;
        const stored = { seq, event: fullEvent, timestamp: fullEvent.timestamp };
        this.stored.push(stored);
        if (this.stored.length > this.maxHistory)
            this.stored.shift();
        if (this.auditTrail) {
            try {
                this.auditTrail.append({
                    actor: 'system', eventType: event.type, target: event.source,
                    decision: 'approved', result: 'success', metadata: { payload: event.payload, seq },
                });
            }
            catch (err) {
                this.logger.error(`[NatsEventBus] AuditTrail append error: ${String(err)}`);
            }
        }
        if (this.js && this.connected) {
            try {
                const subject = `${this.streamName}.${event.type}`;
                await this.js.publish(subject, this.sc.encode(JSON.stringify({ ...fullEvent, _seq: seq })), { msgID: fullEvent.id });
            }
            catch (err) {
                this.logger.warn(`[NatsEventBus] JetStream publish failed, event stored in-memory: ${err}`);
            }
        }
        return fullEvent;
    }
    async getHistory(eventType) {
        if (eventType)
            return this.stored.filter(e => e.event.type === eventType).map(e => e.event);
        return this.stored.map(e => e.event);
    }
    subscriberCount() { return this.subs.size; }
    async clearHistory() { this.stored = []; }
    async replayFromSequence(fromSeq, options) {
        let events = this.stored.filter(s => s.seq >= fromSeq);
        if (options?.eventType)
            events = events.filter(e => e.event.type === options.eventType);
        if (options?.maxEvents && events.length > options.maxEvents)
            events = events.slice(0, options.maxEvents);
        return events.map(e => e.event);
    }
    async replayFromTimestamp(fromTimestamp, options) {
        const from = new Date(fromTimestamp).getTime();
        let events = this.stored.filter(s => new Date(s.timestamp).getTime() >= from);
        if (options?.eventType)
            events = events.filter(e => e.event.type === options.eventType);
        if (options?.maxEvents && events.length > options.maxEvents)
            events = events.slice(0, options.maxEvents);
        return events.map(e => e.event);
    }
    async replayState(options) {
        const events = options?.fromSeq
            ? await this.replayFromSequence(options.fromSeq, options)
            : await this.getHistory(options?.eventType);
        const state = new Map();
        for (const event of events) {
            if (event.type.endsWith('.created') || event.type.endsWith('.updated')) {
                state.set(`${event.source}:${event.type}`, event);
            }
            else if (event.type.endsWith('.deleted')) {
                const key = `${event.source}:${event.type.replace('.deleted', '.created')}`;
                state.delete(key);
            }
        }
        return state;
    }
    async disconnect() {
        if (this.nc) {
            if (!this.nc.isClosed()) {
                await this.nc.drain();
                await this.nc.close();
            }
            this.connected = false;
            this.js = null;
            this.nc = null;
            this.logger.info('[NatsEventBus] Disconnected');
        }
    }
}
exports.NatsEventBus = NatsEventBus;
function createNatsEventBus(config) {
    return new NatsEventBus(config);
}
//# sourceMappingURL=nats-event-bus.js.map