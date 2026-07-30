"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GlobalMemory = void 0;
const logger_1 = require("@ideia/logger");
const crypto_1 = require("crypto");
const logger = (0, logger_1.createLogger)('global-memory');
class GlobalMemory {
    entries = new Map();
    storeBestPractice(topic, content, tags) {
        return this.store(content, 'pattern', `best-practice:${topic}`, tags ?? ['best-practice', topic]);
    }
    storePattern(name, content, tags) {
        return this.store(content, 'pattern', `pattern:${name}`, tags ?? ['pattern', name]);
    }
    store(content, category, source, tags) {
        const now = new Date().toISOString();
        const entry = {
            id: (0, crypto_1.randomUUID)(),
            level: 'global',
            category,
            content,
            source,
            tags,
            confidence: 0.9,
            createdAt: now,
            updatedAt: now,
            accessCount: 0,
            lastAccessed: now,
            ttlMs: 31536000000,
            status: 'active',
            metadata: {},
        };
        this.entries.set(entry.id, entry);
        return { ...entry };
    }
    search(query, category) {
        const lower = query.toLowerCase();
        return Array.from(this.entries.values())
            .filter(e => e.status === 'active')
            .filter(e => !category || e.category === category)
            .filter(e => e.content.toLowerCase().includes(lower) || e.tags.some(t => t.toLowerCase().includes(lower)))
            .map(e => ({ ...e }));
    }
    findByTag(tag) {
        return Array.from(this.entries.values())
            .filter(e => e.status === 'active' && e.tags.includes(tag))
            .map(e => ({ ...e }));
    }
    getAll() {
        return Array.from(this.entries.values()).map(e => ({ ...e }));
    }
    get size() {
        return this.entries.size;
    }
}
exports.GlobalMemory = GlobalMemory;
//# sourceMappingURL=global-memory.js.map