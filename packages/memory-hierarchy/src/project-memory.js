"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProjectMemory = void 0;
const crypto_1 = require("crypto");
class ProjectMemory {
    entries = new Map();
    policy = {
        level: 'project',
        maxEntries: 500,
        defaultTtlMs: 2592000000,
        autoArchiveAfterMs: 7776000000,
        archiveOnAccessThreshold: 3,
        allowedCategories: ['decision', 'pattern', 'architecture', 'error', 'preference', 'event', 'lesson', 'observation'],
    };
    store(content, category, source, tags) {
        const now = new Date().toISOString();
        const entry = {
            id: (0, crypto_1.randomUUID)(),
            level: 'project',
            category,
            content,
            source,
            tags: tags ?? [],
            confidence: 0.85,
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
        entry.accessCount++;
        entry.lastAccessed = new Date().toISOString();
        if (entry.accessCount > this.policy.archiveOnAccessThreshold && entry.status === 'active') {
            entry.status = 'archived';
        }
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
    remove(id) {
        this.entries.delete(id);
    }
    clear() {
        this.entries.clear();
    }
    get size() {
        return this.entries.size;
    }
}
exports.ProjectMemory = ProjectMemory;
//# sourceMappingURL=project-memory.js.map