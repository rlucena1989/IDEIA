"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.InstitutionalMemory = void 0;
const logger_1 = require("@ideia/logger");
const crypto_1 = require("crypto");
const logger = (0, logger_1.createLogger)('institutional-memory');
class InstitutionalMemory {
    entries = new Map();
    policy = {
        level: 'institutional',
        maxEntries: 200,
        defaultTtlMs: 31536000000,
        autoArchiveAfterMs: 63072000000,
        archiveOnAccessThreshold: 1,
        allowedCategories: ['policy', 'pattern', 'decision', 'lesson'],
    };
    storePolicy(name, content, tags) {
        return this.store(content, 'policy', `policy:${name}`, tags ?? ['policy']);
    }
    storeLesson(content, source, tags) {
        return this.store(content, 'lesson', source, tags ?? ['lesson']);
    }
    store(content, category, source, tags) {
        const now = new Date().toISOString();
        const entry = {
            id: (0, crypto_1.randomUUID)(),
            level: 'institutional',
            category,
            content,
            source,
            tags,
            confidence: 0.95,
            createdAt: now,
            updatedAt: now,
            accessCount: 0,
            lastAccessed: now,
            ttlMs: this.policy.defaultTtlMs,
            status: 'active',
            metadata: {},
        };
        this.entries.set(entry.id, entry);
        return { ...entry };
    }
    getPolicy(name) {
        return Array.from(this.entries.values()).find(e => e.source === `policy:${name}`);
    }
    getAllPolicies() {
        return this.search('', 'policy');
    }
    search(query, category) {
        const lower = query.toLowerCase();
        return Array.from(this.entries.values())
            .filter(e => e.status === 'active')
            .filter(e => !category || e.category === category)
            .filter(e => e.content.toLowerCase().includes(lower) || e.tags.some(t => t.toLowerCase().includes(lower)))
            .map(e => ({ ...e }));
    }
    getAll() {
        return Array.from(this.entries.values()).map(e => ({ ...e }));
    }
    get size() {
        return this.entries.size;
    }
}
exports.InstitutionalMemory = InstitutionalMemory;
//# sourceMappingURL=institutional-memory.js.map