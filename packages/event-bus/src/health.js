"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.HealthCheck = void 0;
exports.createHealthCheck = createHealthCheck;
class HealthCheck {
    connectionManager;
    streamManager;
    dlq;
    consumerGroupManager;
    kvStore;
    objectStore;
    reqReplyManager;
    constructor(connectionManager) {
        this.connectionManager = connectionManager;
    }
    setStreamManager(manager) { this.streamManager = manager; }
    setDLQ(dlq) { this.dlq = dlq; }
    setConsumerGroupManager(manager) { this.consumerGroupManager = manager; }
    setKVStore(store) { this.kvStore = store; }
    setObjectStore(store) { this.objectStore = store; }
    setRequestReplyManager(manager) { this.reqReplyManager = manager; }
    async check() {
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
    async checkConnection() {
        try {
            const connected = await this.connectionManager.isConnected();
            return connected
                ? { status: 'healthy', message: 'Connected' }
                : { status: 'degraded', message: 'Not connected' };
        }
        catch (_err) {
            return { status: 'unhealthy', message: String(_err) };
        }
    }
    async checkStreams() {
        try {
            if (!this.streamManager)
                return { status: 'healthy', message: 'Not configured' };
            const streams = await this.streamManager.listStreams();
            return { status: 'healthy', message: `${streams.length} streams active` };
        }
        catch (_err) {
            return { status: 'unhealthy', message: String(_err) };
        }
    }
    async checkDLQ() {
        try {
            if (!this.dlq)
                return { status: 'healthy', message: 'Not configured' };
            const stats = await this.dlq.getStats();
            return { status: 'healthy', details: stats };
        }
        catch (_err) {
            return { status: 'unhealthy', message: String(_err) };
        }
    }
    async checkConsumers() {
        try {
            if (!this.consumerGroupManager)
                return { status: 'healthy', message: 'Not configured' };
            const groups = this.consumerGroupManager.listGroups();
            return { status: 'healthy', message: `${groups.length} consumer groups` };
        }
        catch (_err) {
            return { status: 'unhealthy', message: String(_err) };
        }
    }
    async checkKV() {
        try {
            if (!this.kvStore)
                return { status: 'healthy', message: 'Not configured' };
            const stats = await this.kvStore.getStats();
            return { status: 'healthy', details: stats };
        }
        catch (_err) {
            return { status: 'unhealthy', message: String(_err) };
        }
    }
    async checkObjectStore() {
        try {
            if (!this.objectStore)
                return { status: 'healthy', message: 'Not configured' };
            const stats = await this.objectStore.getStats();
            return { status: 'healthy', details: stats };
        }
        catch (_err) {
            return { status: 'unhealthy', message: String(_err) };
        }
    }
    async checkReqReply() {
        try {
            if (!this.reqReplyManager)
                return { status: 'healthy', message: 'Not configured' };
            const handlers = this.reqReplyManager.getRegisteredHandlers();
            return { status: 'healthy', message: `${handlers.length} handlers registered` };
        }
        catch (_err) {
            return { status: 'unhealthy', message: String(_err) };
        }
    }
    calculateOverallStatus(components) {
        const allHealthy = Object.values(components).every(c => c.status === 'healthy');
        const hasUnhealthy = Object.values(components).some(c => c.status === 'unhealthy');
        if (hasUnhealthy)
            return 'unhealthy';
        if (!allHealthy)
            return 'degraded';
        return 'healthy';
    }
}
exports.HealthCheck = HealthCheck;
function createHealthCheck(connectionManager) {
    return new HealthCheck(connectionManager);
}
//# sourceMappingURL=health.js.map