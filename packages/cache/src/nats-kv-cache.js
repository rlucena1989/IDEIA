"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NatsKvCache = void 0;
class NatsKvCache {
    kv;
    hits = 0;
    misses = 0;
    evictions = 0;
    localCache = new Map();
    constructor(_options) {
    }
    async connect(_url) {
        throw new Error(`NatsKvCache.connect not implemented. Install 'nats' package and pass a NATS KV store.\n`
            + `Usage: const sc = StringCodec(); const kv = await jetstreamClient.views.kv('cache');`);
    }
    async get(key) {
        const local = this.localCache.get(key);
        if (local) {
            if (Date.now() > local.expiresAt) {
                this.localCache.delete(key);
                this.evictions++;
                this.misses++;
                return undefined;
            }
            this.hits++;
            return local.value;
        }
        this.misses++;
        return undefined;
    }
    async set(key, value, ttlMs) {
        this.localCache.set(key, {
            value,
            expiresAt: Date.now() + (ttlMs ?? 60_000),
        });
    }
    async delete(key) {
        return this.localCache.delete(key);
    }
    async has(key) {
        const local = this.localCache.get(key);
        if (!local)
            return false;
        if (Date.now() > local.expiresAt) {
            this.localCache.delete(key);
            this.evictions++;
            return false;
        }
        return true;
    }
    async clear() {
        this.localCache.clear();
        this.hits = 0;
        this.misses = 0;
        this.evictions = 0;
    }
    async stats() {
        const size = this.localCache.size;
        const totalRequests = this.hits + this.misses;
        return {
            size,
            hits: this.hits,
            misses: this.misses,
            evictions: this.evictions,
            hitRate: totalRequests > 0 ? this.hits / totalRequests : 0,
        };
    }
    async keys() {
        return Array.from(this.localCache.keys());
    }
}
exports.NatsKvCache = NatsKvCache;
//# sourceMappingURL=nats-kv-cache.js.map