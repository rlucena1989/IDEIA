"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.KVStore = void 0;
exports.createKVStore = createKVStore;
const logger_1 = require("@ideia/logger");
const log = (0, logger_1.createLogger)('kv-store');
const DEFAULT_KV_CONFIG = {
    maxAge: 24 * 60 * 60 * 1000,
    maxEntries: 10000,
};
class KVStore {
    connectionManager;
    config;
    store = new Map();
    versionCounter = 0;
    constructor(connectionManager, config = {}) {
        this.connectionManager = connectionManager;
        this.config = { ...DEFAULT_KV_CONFIG, ...config };
    }
    async initialize() {
        try {
            await this.connectionManager.connect();
        }
        catch (err) {
            log.info(`Initialized (offline mode): ${err}`);
            return;
        }
        log.info('Initialized');
    }
    async put(key, value) {
        const now = Date.now();
        this.versionCounter++;
        const entry = { key, value, version: this.versionCounter, createdAt: now, updatedAt: now };
        this.store.set(key, entry);
        await this.cleanup();
        log.info(`Put key: ${key} (version ${entry.version})`);
        return entry.version;
    }
    async get(key) {
        const entry = this.store.get(key);
        if (!entry)
            return null;
        if (this.config.maxAge && (Date.now() - entry.updatedAt) > this.config.maxAge) {
            await this.delete(key);
            return null;
        }
        return entry;
    }
    async delete(key) {
        const deleted = this.store.delete(key);
        if (deleted)
            log.info(`Deleted key: ${key}`);
        return deleted;
    }
    async update(key, value, expectedVersion) {
        const entry = this.store.get(key);
        if (!entry)
            throw new Error(`Key ${key} not found`);
        if (expectedVersion !== undefined && entry.version !== expectedVersion) {
            throw new Error(`Version mismatch for key ${key}: expected ${expectedVersion}, got ${entry.version}`);
        }
        return await this.put(key, value);
    }
    async keys() { return Array.from(this.store.keys()); }
    async entries() { return Array.from(this.store.values()); }
    async has(key) { return this.store.has(key); }
    async clear() {
        const count = this.store.size;
        this.store.clear();
        log.info(`Cleared ${count} entries`);
    }
    async cleanup() {
        const now = Date.now();
        if (this.config.maxAge) {
            const cutoff = now - this.config.maxAge;
            for (const [key, entry] of this.store.entries()) {
                if ((now - entry.updatedAt) > this.config.maxAge) {
                    this.store.delete(key);
                }
            }
        }
        if (this.config.maxEntries && this.store.size > this.config.maxEntries) {
            const entries = Array.from(this.store.entries())
                .sort((a, b) => a[1].updatedAt - b[1].updatedAt);
            const toRemove = entries.slice(0, this.store.size - this.config.maxEntries);
            for (const [key] of toRemove) {
                this.store.delete(key);
            }
        }
    }
    async getStats() {
        return { totalEntries: this.store.size, totalVersions: this.versionCounter };
    }
}
exports.KVStore = KVStore;
function createKVStore(connectionManager, config) {
    return new KVStore(connectionManager, config);
}
//# sourceMappingURL=kv-store.js.map