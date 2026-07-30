"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LLMCache = void 0;
const crypto_1 = require("crypto");
const DEFAULT_CONFIG = {
    planCacheTtlMs: 3600000,
    decisionCacheTtlMs: 300000,
    embeddingCacheTtlMs: 600000,
    maxEntries: 1000,
};
class LLMCache {
    store = new Map();
    config;
    constructor(config = {}) {
        this.config = { ...DEFAULT_CONFIG, ...config };
    }
    get(key) {
        const entry = this.store.get(key);
        if (!entry)
            return { found: false };
        const age = Date.now() - new Date(entry.createdAt).getTime();
        if (age > entry.ttlMs) {
            this.store.delete(key);
            return { found: false };
        }
        entry.accessCount++;
        entry.lastAccessed = new Date().toISOString();
        this.store.set(key, entry);
        return { found: true, value: entry.value, entry };
    }
    set(key, value, ttlMs) {
        if (this.store.size >= this.config.maxEntries) {
            this.evictLRU();
        }
        const entry = {
            key,
            value,
            createdAt: new Date().toISOString(),
            ttlMs: ttlMs ?? this.config.decisionCacheTtlMs,
            accessCount: 0,
            lastAccessed: new Date().toISOString(),
        };
        this.store.set(key, entry);
    }
    invalidate(key) {
        this.store.delete(key);
    }
    invalidateByPrefix(prefix) {
        for (const key of this.store.keys()) {
            if (key.startsWith(prefix)) {
                this.store.delete(key);
            }
        }
    }
    clear() {
        this.store.clear();
    }
    size() {
        return this.store.size;
    }
    getStats() {
        let oldest = null;
        let newest = null;
        for (const entry of this.store.values()) {
            if (!oldest || entry.createdAt < oldest)
                oldest = entry.createdAt;
            if (!newest || entry.createdAt > newest)
                newest = entry.createdAt;
        }
        return {
            entries: this.store.size,
            maxEntries: this.config.maxEntries,
            oldest,
            newest,
        };
    }
    makeKey(prefix, ...parts) {
        const content = parts.join('|');
        const hash = (0, crypto_1.createHash)('sha256').update(content).digest('hex').slice(0, 12);
        return `${prefix}:${hash}`;
    }
    evictLRU() {
        let oldest = null;
        for (const [key, entry] of this.store.entries()) {
            if (!oldest || entry.lastAccessed < oldest.lastAccessed) {
                oldest = { key, lastAccessed: entry.lastAccessed };
            }
        }
        if (oldest) {
            this.store.delete(oldest.key);
        }
    }
}
exports.LLMCache = LLMCache;
//# sourceMappingURL=llm-cache.js.map