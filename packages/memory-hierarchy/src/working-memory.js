"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WorkingMemory = void 0;
const crypto_1 = require("crypto");
class WorkingMemory {
    entries = new Map();
    policy = {
        level: 'working',
        maxEntries: 50,
        defaultTtlMs: 3600000,
        autoArchiveAfterMs: 1800000,
        archiveOnAccessThreshold: 10,
        allowedCategories: ['decision', 'error', 'observation', 'event'],
    };
    store(content, category, source, tags) {
        if (!this.policy.allowedCategories.includes(category)) {
            throw new Error(`Category ${category} not allowed in working memory`);
        }
        if (this.entries.size >= this.policy.maxEntries) {
            this.evictOldest();
        }
        const now = new Date().toISOString();
        const entry = {
            id: (0, crypto_1.randomUUID)(),
            level: 'working',
            category,
            content,
            source,
            tags: tags ?? [],
            confidence: 0.8,
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
    get(id) {
        const entry = this.entries.get(id);
        if (!entry)
            return undefined;
        if (this.isExpired(entry)) {
            this.entries.delete(id);
            return undefined;
        }
        entry.accessCount++;
        entry.lastAccessed = new Date().toISOString();
        return { ...entry };
    }
    search(query) {
        const lower = query.toLowerCase();
        return Array.from(this.entries.values())
            .filter(e => !this.isExpired(e) && e.status === 'active')
            .filter(e => e.content.toLowerCase().includes(lower) || e.tags.some(t => t.toLowerCase().includes(lower)))
            .map(e => ({ ...e }));
    }
    getAll() {
        this.purgeExpired();
        return Array.from(this.entries.values())
            .filter(e => e.status === 'active')
            .map(e => ({ ...e }));
    }
    clear() {
        this.entries.clear();
    }
    remove(id) {
        this.entries.delete(id);
    }
    get size() {
        this.purgeExpired();
        return this.entries.size;
    }
    isExpired(entry) {
        const age = Date.now() - new Date(entry.createdAt).getTime();
        return age > entry.ttlMs;
    }
    purgeExpired() {
        for (const [id, entry] of this.entries) {
            if (this.isExpired(entry)) {
                this.entries.delete(id);
            }
        }
    }
    evictOldest() {
        let oldest = null;
        for (const [id, entry] of this.entries) {
            if (!oldest || entry.lastAccessed < oldest.lastAccessed) {
                oldest = { id, lastAccessed: entry.lastAccessed };
            }
        }
        if (oldest)
            this.entries.delete(oldest.id);
    }
}
exports.WorkingMemory = WorkingMemory;
//# sourceMappingURL=working-memory.js.map