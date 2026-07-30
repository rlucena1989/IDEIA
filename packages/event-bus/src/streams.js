"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NatsStreamManager = exports.EVENT_STREAMS = void 0;
exports.createNatsStreamManager = createNatsStreamManager;
const nats_1 = require("nats");
const logger_1 = require("@ideia/logger");
const log = (0, logger_1.createLogger)('nats-stream-manager');
exports.EVENT_STREAMS = [
    'agent.started', 'agent.completed', 'agent.failed', 'agent.stuck',
    'task.created', 'task.started', 'task.completed', 'task.failed',
    'policy.evaluated', 'policy.violated', 'cycle.completed',
    'feedback.submitted', 'trace.linked', 'workflow.completed',
    'file.change', 'terminal.execution',
];
const DEFAULT_STREAM_CONFIG = {
    maxAge: 24 * 60 * 60 * 1000,
    maxBytes: 1024 * 1024 * 1024,
    maxMsgs: 100000,
};
class NatsStreamManager {
    connectionManager;
    streamConfigs = new Map();
    inMemoryStreams = new Map();
    jsm = null;
    jetstreamEnabled = false;
    constructor(connectionManager) {
        this.connectionManager = connectionManager;
    }
    async initialize() {
        try {
            await this.connectionManager.connect();
        }
        catch (_err) {
            log.info(`Initialized (offline mode): ${_err}`);
            return;
        }
        const nc = this.connectionManager.getConnection();
        if (nc) {
            try {
                this.jsm = await nc.jetstreamManager();
                this.jetstreamEnabled = true;
                log.info('JetStream available');
            }
            catch {
                log.info('JetStream unavailable, using in-memory mode');
            }
        }
        for (const eventType of exports.EVENT_STREAMS) {
            this.inMemoryStreams.set(eventType, []);
            this.streamConfigs.set(eventType, DEFAULT_STREAM_CONFIG);
            if (this.jetstreamEnabled && this.jsm) {
                try {
                    await this.jsm.streams.add({
                        name: this.toStreamName(eventType),
                        subjects: [this.getSubject(eventType)],
                        storage: nats_1.StorageType.File,
                        max_age: (DEFAULT_STREAM_CONFIG.maxAge ?? 86400000) * 1_000_000,
                        max_bytes: DEFAULT_STREAM_CONFIG.maxBytes,
                        max_msgs: DEFAULT_STREAM_CONFIG.maxMsgs,
                    });
                }
                catch { /* stream may exist */ }
            }
        }
        log.info(`Initialized ${exports.EVENT_STREAMS.length} event streams (${this.jetstreamEnabled ? 'JetStream' : 'in-memory'} mode)`);
    }
    toStreamName(eventType) {
        return `ideia_${eventType.replace(/\./g, '_')}`;
    }
    async createStream(eventType, options = {}) {
        const config = { ...DEFAULT_STREAM_CONFIG, ...options };
        this.streamConfigs.set(eventType, config);
        if (!this.inMemoryStreams.has(eventType))
            this.inMemoryStreams.set(eventType, []);
        if (this.jetstreamEnabled && this.jsm) {
            try {
                await this.jsm.streams.add({
                    name: this.toStreamName(eventType),
                    subjects: [this.getSubject(eventType)],
                    storage: nats_1.StorageType.File,
                    max_age: ((config.maxAge ?? DEFAULT_STREAM_CONFIG.maxAge) ?? 86400000) * 1_000_000,
                    max_bytes: config.maxBytes ?? DEFAULT_STREAM_CONFIG.maxBytes,
                    max_msgs: config.maxMsgs ?? DEFAULT_STREAM_CONFIG.maxMsgs,
                });
            }
            catch { /* fall through */ }
        }
        log.info(`Created stream for ${eventType}`);
    }
    async deleteStream(eventType) {
        this.inMemoryStreams.delete(eventType);
        this.streamConfigs.delete(eventType);
        if (this.jetstreamEnabled && this.jsm) {
            try {
                await this.jsm.streams.delete(this.toStreamName(eventType));
            }
            catch { /* ignore */ }
        }
    }
    async getStreamInfo(eventType) {
        return this.streamConfigs.get(eventType) || null;
    }
    async listStreams() {
        if (this.jetstreamEnabled && this.jsm) {
            try {
                const streams = [];
                for await (const s of this.jsm.streams.list()) {
                    streams.push(s.config.name);
                }
                return streams;
            }
            catch { /* fall through */ }
        }
        return Array.from(this.inMemoryStreams.keys());
    }
    async purgeStream(eventType) {
        this.inMemoryStreams.set(eventType, []);
        if (this.jetstreamEnabled && this.jsm) {
            try {
                await this.jsm.streams.purge(this.toStreamName(eventType));
            }
            catch { /* ignore */ }
        }
    }
    getSubject(eventType) {
        return `ideia.events.${eventType}`;
    }
    async publish(eventType, data) {
        const stream = this.inMemoryStreams.get(eventType);
        if (!stream)
            throw new Error(`Stream ${eventType} not initialized`);
        const now = Date.now();
        stream.push({ data, timestamp: now });
        if (this.jetstreamEnabled && this.connectionManager.getConnection()) {
            try {
                const nc = this.connectionManager.getConnection();
                if (!nc)
                    return;
                const sc = this.connectionManager.getStringCodec();
                nc.publish(this.getSubject(eventType), sc.encode(JSON.stringify(data)));
            }
            catch { /* publish failed, in memory */ }
        }
        const config = this.streamConfigs.get(eventType) || DEFAULT_STREAM_CONFIG;
        if (config.maxAge) {
            const cutoff = now - config.maxAge;
            while (stream.length > 0 && stream[0].timestamp < cutoff)
                stream.shift();
        }
        if (config.maxMsgs && stream.length > config.maxMsgs) {
            stream.splice(0, stream.length - config.maxMsgs);
        }
    }
    async consume(eventType) {
        const stream = this.inMemoryStreams.get(eventType);
        if (!stream)
            throw new Error(`Stream ${eventType} not initialized`);
        return [...stream];
    }
    async createConsumer(eventType, consumerName) {
        if (this.jetstreamEnabled && this.jsm) {
            try {
                await this.jsm.consumers.add(this.toStreamName(eventType), {
                    durable_name: consumerName,
                    ack_policy: 'explicit',
                    max_deliver: 3,
                    ack_wait: 30_000_000_000,
                });
                return;
            }
            catch { /* fall through */ }
        }
        log.info(`Created consumer ${consumerName} for ${eventType} (in-memory mode)`);
    }
    async deleteConsumer(eventType, consumerName) {
        if (this.jetstreamEnabled && this.jsm) {
            try {
                await this.jsm.consumers.delete(this.toStreamName(eventType), consumerName);
                return;
            }
            catch { /* fall through */ }
        }
    }
    async listConsumers(eventType) {
        if (this.jetstreamEnabled && this.jsm) {
            try {
                const consumers = [];
                for await (const c of this.jsm.consumers.list(this.toStreamName(eventType))) {
                    consumers.push(c.name);
                }
                return consumers;
            }
            catch { /* fall through */ }
        }
        return [];
    }
    getJetstreamStatus() {
        return this.jetstreamEnabled ? 'enabled' : 'disabled (in-memory)';
    }
}
exports.NatsStreamManager = NatsStreamManager;
function createNatsStreamManager(connectionManager) {
    return new NatsStreamManager(connectionManager);
}
//# sourceMappingURL=streams.js.map