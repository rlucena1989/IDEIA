"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ObjectStore = void 0;
exports.createObjectStore = createObjectStore;
const logger_1 = require("@ideia/logger");
const log = (0, logger_1.createLogger)('object-store');
const DEFAULT_OBJECT_STORE_CONFIG = {
    maxAge: 7 * 24 * 60 * 60 * 1000,
    maxObjects: 1000,
    maxSizeBytes: 1024 * 1024 * 1024,
};
class ObjectStore {
    connectionManager;
    config;
    store = new Map();
    versionCounter = 0;
    totalSizeBytes = 0;
    constructor(connectionManager, config = {}) {
        this.connectionManager = connectionManager;
        this.config = { ...DEFAULT_OBJECT_STORE_CONFIG, ...config };
    }
    async initialize(config) {
        if (config) {
            this.config = { ...this.config, ...config };
        }
        try {
            await this.connectionManager.connect();
        }
        catch (_err) {
            log.info(`Initialized (offline mode): ${_err}`);
            return;
        }
        log.info('Initialized');
    }
    async put(name, data, contentType) {
        const now = Date.now();
        this.versionCounter++;
        if (this.config.maxSizeBytes && this.totalSizeBytes + data.length > this.config.maxSizeBytes) {
            throw new Error(`Object store size limit exceeded (max: ${this.config.maxSizeBytes} bytes)`);
        }
        const metadata = {
            name,
            size: data.length,
            contentType,
            uploadedAt: now,
            version: this.versionCounter,
        };
        this.store.set(name, { metadata, data });
        this.totalSizeBytes += data.length;
        await this.cleanup();
        return metadata;
    }
    async get(name) {
        const obj = this.store.get(name);
        if (!obj)
            return null;
        if (this.config.maxAge && (Date.now() - obj.metadata.uploadedAt) > this.config.maxAge) {
            await this.delete(name);
            return null;
        }
        return obj;
    }
    async getMetadata(name) {
        const obj = await this.get(name);
        return obj ? obj.metadata : null;
    }
    async delete(name) {
        const obj = this.store.get(name);
        if (obj) {
            this.totalSizeBytes -= obj.metadata.size;
            this.store.delete(name);
            return true;
        }
        return false;
    }
    async list() {
        return Array.from(this.store.values()).map(obj => obj.metadata);
    }
    async has(name) {
        return this.store.has(name);
    }
    async clear() {
        this.store.clear();
        this.totalSizeBytes = 0;
    }
    async cleanup() {
        const now = Date.now();
        if (this.config.maxAge) {
            for (const [name, obj] of this.store.entries()) {
                if ((now - obj.metadata.uploadedAt) > this.config.maxAge) {
                    this.store.delete(name);
                    this.totalSizeBytes -= obj.metadata.size;
                }
            }
        }
        if (this.config.maxObjects && this.store.size > this.config.maxObjects) {
            const entries = Array.from(this.store.entries())
                .sort((a, b) => a[1].metadata.uploadedAt - b[1].metadata.uploadedAt);
            const toRemove = entries.slice(0, this.store.size - this.config.maxObjects);
            for (const [name, obj] of toRemove) {
                this.store.delete(name);
                this.totalSizeBytes -= obj.metadata.size;
            }
        }
    }
    async getStats() {
        return {
            totalObjects: this.store.size,
            totalSizeBytes: this.totalSizeBytes,
            totalVersions: this.versionCounter,
        };
    }
}
exports.ObjectStore = ObjectStore;
function createObjectStore(connectionManager, config) {
    return new ObjectStore(connectionManager, config);
}
//# sourceMappingURL=object-store.js.map