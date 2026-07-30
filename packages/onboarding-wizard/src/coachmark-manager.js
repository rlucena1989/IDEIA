"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CoachmarkManager = exports.MemoryCoachmarkStorage = void 0;
class MemoryCoachmarkStorage {
    store = new Map();
    get(key) {
        return this.store.get(key);
    }
    set(key, value) {
        this.store.set(key, value);
    }
    delete(key) {
        return this.store.delete(key);
    }
    list() {
        return Array.from(this.store.values());
    }
}
exports.MemoryCoachmarkStorage = MemoryCoachmarkStorage;
class CoachmarkManager {
    storage;
    coachmarks = new Map();
    onShow;
    constructor(storage = new MemoryCoachmarkStorage()) {
        this.storage = storage;
        this.loadFromStorage();
    }
    setOnShow(callback) {
        this.onShow = callback;
    }
    show(coachmark) {
        const existing = this.coachmarks.get(coachmark.id);
        if (existing && existing.completed)
            return;
        const entry = {
            ...coachmark,
            completed: false,
            createdAt: new Date().toISOString(),
        };
        this.coachmarks.set(coachmark.id, entry);
        this.storage.set(coachmark.id, entry);
        if (this.onShow) {
            this.onShow(entry);
        }
    }
    dismiss(id) {
        const coachmark = this.coachmarks.get(id);
        if (!coachmark)
            return false;
        coachmark.completed = true;
        coachmark.completedAt = new Date().toISOString();
        this.coachmarks.set(id, coachmark);
        this.storage.set(id, coachmark);
        return true;
    }
    isCompleted(id) {
        const coachmark = this.coachmarks.get(id);
        return coachmark ? coachmark.completed : false;
    }
    reset() {
        this.coachmarks.clear();
        const stored = this.storage.list();
        for (const c of stored) {
            this.storage.delete(c.id);
        }
    }
    resetFeature(feature) {
        for (const [id, coachmark] of this.coachmarks) {
            if (coachmark.feature === feature) {
                coachmark.completed = false;
                coachmark.completedAt = undefined;
                this.coachmarks.set(id, coachmark);
                this.storage.set(id, coachmark);
            }
        }
    }
    getPending() {
        return Array.from(this.coachmarks.values()).filter(c => !c.completed);
    }
    getAll() {
        return Array.from(this.coachmarks.values());
    }
    getById(id) {
        return this.coachmarks.get(id);
    }
    getProgress() {
        const all = this.getAll();
        const completed = all.filter(c => c.completed).length;
        const total = all.length;
        const byFeature = {};
        for (const c of all) {
            if (!byFeature[c.feature])
                byFeature[c.feature] = { completed: 0, total: 0 };
            byFeature[c.feature].total++;
            if (c.completed)
                byFeature[c.feature].completed++;
        }
        return { completed, total, percent: total > 0 ? Math.round(completed / total * 100) : 0, byFeature };
    }
    getNextPending() {
        return Array.from(this.coachmarks.values()).find(c => !c.completed);
    }
    dismissAll() {
        const now = new Date().toISOString();
        for (const [id, coachmark] of this.coachmarks) {
            coachmark.completed = true;
            coachmark.completedAt = now;
            this.coachmarks.set(id, coachmark);
            this.storage.set(id, coachmark);
        }
    }
    getFeatureProgress(feature) {
        const all = this.getAll().filter(c => c.feature === feature);
        const completed = all.filter(c => c.completed).length;
        return { completed, total: all.length };
    }
    isAllCompleted() {
        return this.getAll().every(c => c.completed);
    }
    loadFromStorage() {
        const stored = this.storage.list();
        for (const coachmark of stored) {
            this.coachmarks.set(coachmark.id, coachmark);
        }
    }
}
exports.CoachmarkManager = CoachmarkManager;
//# sourceMappingURL=coachmark-manager.js.map