"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MemoryStore = exports.createVectorSearch = exports.VectorSearch = void 0;
exports.createMemoryRecord = createMemoryRecord;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const crypto_1 = __importDefault(require("crypto"));
const vector_search_1 = require("./vector-search");
var vector_search_2 = require("./vector-search");
Object.defineProperty(exports, "VectorSearch", { enumerable: true, get: function () { return vector_search_2.VectorSearch; } });
Object.defineProperty(exports, "createVectorSearch", { enumerable: true, get: function () { return vector_search_2.createVectorSearch; } });
function createMemoryRecord(params) {
    return {
        memoryId: crypto_1.default.randomUUID(),
        category: params.category,
        source: params.source,
        summary: params.summary,
        tags: params.tags ?? [],
        createdAt: new Date().toISOString(),
        severity: params.severity,
    };
}
class MemoryStore {
    filePath;
    inMemoryRecords = [];
    _loaded = false;
    _lockAcquired = false;
    _saveTimeout = null;
    vectorSearch;
    _eventBus;
    _eventCount = 0;
    _subscriptionIds = [];
    constructor(filePath, vectorSearch) {
        this.filePath = filePath;
        this.vectorSearch = vectorSearch ?? new vector_search_1.VectorSearch(384);
    }
    get eventCount() {
        return this._eventCount;
    }
    setVectorSearch(vs) { this.vectorSearch = vs; }
    getVectorSearch() { return this.vectorSearch; }
    async integrateWithEventBus(eventBus) {
        this.disconnectEventBus();
        this._eventBus = eventBus;
        const subscribe = async (type) => {
            const id = await eventBus.subscribe(type, (event) => {
                this._eventCount++;
                const record = createMemoryRecord({
                    category: this.eventTypeToCategory(event.type),
                    source: event.source,
                    summary: `[${event.type}] ${JSON.stringify(event.payload ?? {})}`,
                    tags: [event.type, event.source],
                    severity: 'low',
                });
                record.context = { eventId: event.id, timestamp: event.timestamp, metadata: event.metadata };
                this.append(record);
                this.vectorSearch.addAsync(`Event ${event.type} from ${event.source}: ${JSON.stringify(event.payload ?? {})}`, { eventType: event.type, source: event.source, eventId: event.id }).catch(() => { });
            });
            this._subscriptionIds.push(id);
        };
        await subscribe('policy.evaluated');
        await subscribe('cycle.completed');
        await subscribe('feedback.submitted');
        await subscribe('agent.action');
    }
    disconnectEventBus() {
        if (this._eventBus) {
            for (const id of this._subscriptionIds) {
                this._eventBus.unsubscribe(id);
            }
        }
        this._subscriptionIds = [];
        this._eventBus = undefined;
    }
    eventTypeToCategory(type) {
        switch (type) {
            case 'policy.evaluated': return 'policy';
            case 'cycle.completed': return 'cycle';
            case 'feedback.submitted': return 'decision';
            case 'agent.action': return 'agent';
            default: return 'change';
        }
    }
    acquireLock() {
        if (!this.filePath)
            return true;
        const lockPath = this.filePath + '.lock';
        for (let attempt = 0; attempt < 3; attempt++) {
            try {
                if (attempt > 0) {
                    this.sleep(50 + Math.random() * 50);
                }
                fs_1.default.mkdirSync(path_1.default.dirname(lockPath), { recursive: true });
                fs_1.default.writeFileSync(lockPath, String(process.pid), { flag: 'wx' });
                this._lockAcquired = true;
                return true;
            }
            catch {
                continue;
            }
        }
        return false;
    }
    sleep(ms) {
        const start = Date.now();
        while (Date.now() - start < ms) {
            // busy-wait is intentional for synchronous lock retry
        }
    }
    releaseLock() {
        if (!this._lockAcquired || !this.filePath)
            return;
        try {
            fs_1.default.unlinkSync(this.filePath + '.lock');
        }
        catch (_err) {
            // Log silenciado propositalmente — falha nao bloqueia fluxo
        }
        this._lockAcquired = false;
    }
    load() {
        this._loaded = true;
        if (!this.filePath || !fs_1.default.existsSync(this.filePath)) {
            return {
                sessionId: crypto_1.default.randomUUID(),
                workspaceRoot: '',
                activeTask: null,
                preferences: {},
                lastDecisions: [],
                context: {},
                records: [],
            };
        }
        try {
            const data = JSON.parse(fs_1.default.readFileSync(this.filePath, 'utf-8'));
            this.inMemoryRecords = data.records ?? [];
            return data;
        }
        catch {
            if (this.filePath && fs_1.default.existsSync(this.filePath)) {
                fs_1.default.renameSync(this.filePath, this.filePath + '.corrupted');
            }
            return {
                sessionId: crypto_1.default.randomUUID(),
                workspaceRoot: '',
                activeTask: null,
                preferences: {},
                lastDecisions: [],
                context: {},
                records: [],
            };
        }
    }
    atomicWrite(filePath, data) {
        const tmpPath = filePath + '.tmp';
        fs_1.default.writeFileSync(tmpPath, data, 'utf-8');
        fs_1.default.renameSync(tmpPath, filePath);
    }
    async atomicWriteAsync(filePath, data) {
        const tmpPath = filePath + '.tmp';
        await fs_1.default.promises.writeFile(tmpPath, data, 'utf-8');
        await fs_1.default.promises.rename(tmpPath, filePath);
    }
    save(state) {
        if (!this._loaded)
            this.load();
        state.records = this.inMemoryRecords;
        if (this.filePath) {
            if (!this.acquireLock())
                return;
            try {
                fs_1.default.mkdirSync(path_1.default.dirname(this.filePath), { recursive: true });
                const data = JSON.stringify(state, null, 2);
                fs_1.default.writeFileSync(this.filePath + '.backup', data, 'utf-8');
                this.atomicWrite(this.filePath, data);
            }
            finally {
                this.releaseLock();
            }
        }
    }
    async saveAsync(state) {
        if (!this._loaded)
            this.load();
        state.records = this.inMemoryRecords;
        if (this.filePath) {
            if (!this.acquireLock())
                return;
            try {
                const data = JSON.stringify(state, null, 2);
                await fs_1.default.promises.mkdir(path_1.default.dirname(this.filePath), { recursive: true });
                await fs_1.default.promises.writeFile(this.filePath + '.backup', data, 'utf-8');
                await this.atomicWriteAsync(this.filePath, data);
            }
            finally {
                this.releaseLock();
            }
        }
    }
    debouncedSave(state) {
        if (this._saveTimeout)
            clearTimeout(this._saveTimeout);
        this._saveTimeout = setTimeout(() => {
            this.save(state);
            this._saveTimeout = null;
        }, 0);
    }
    pushDecision(state, decision) {
        state.lastDecisions.push(decision);
        if (state.lastDecisions.length > 100) {
            state.lastDecisions = state.lastDecisions.slice(-100);
        }
        this.debouncedSave(state);
    }
    updateContext(state, ctx) {
        Object.assign(state.context, ctx);
        this.debouncedSave(state);
    }
    ensureLoaded() {
        if (!this._loaded)
            this.load();
    }
    append(record) {
        this.ensureLoaded();
        this.inMemoryRecords.push(record);
        this.emitMemoryEvent('memory:created', record);
        if (this.filePath) {
            const records = [...this.inMemoryRecords];
            const state = this.load();
            state.records = records;
            this.inMemoryRecords = records;
            this.debouncedSave(state);
        }
    }
    emitMemoryEvent(type, record) {
        if (this._eventBus) {
            this._eventBus.emit({
                type,
                source: 'memory-store',
                payload: {
                    memoryId: record.memoryId,
                    category: record.category,
                    summary: record.summary,
                },
                metadata: { timestamp: new Date().toISOString() },
            }).catch(() => { });
        }
    }
    list() {
        return [...this.inMemoryRecords];
    }
    findByCategory(category) {
        return this.inMemoryRecords.filter(r => r.category === category);
    }
    findBySeverity(severity) {
        return this.inMemoryRecords.filter(r => r.severity === severity);
    }
    search(query) {
        return this.hybridSearch({ query }).results;
    }
    hybridSearch(options) {
        const q = options.query.toLowerCase();
        const keywordResults = this.inMemoryRecords.filter(r => r.summary.toLowerCase().includes(q) ||
            (r.tags && r.tags.some(t => t.toLowerCase().includes(q))) ||
            (r.category && r.category.toLowerCase().includes(q)));
        const semanticResults = this.vectorSearch.size > 0
            ? this.vectorSearch.search(options.query, options.topK ?? 5, {
                minScore: options.minScore ?? 0.1,
                filter: options.category ? (m) => m.category === options.category : undefined,
            })
            : [];
        const seen = new Set();
        const merged = [];
        const scores = [];
        for (const sr of semanticResults) {
            const record = this.inMemoryRecords.find(r => r.memoryId === sr.record.id);
            if (record && !seen.has(record.memoryId)) {
                seen.add(record.memoryId);
                merged.push(record);
                scores.push(sr.score);
            }
        }
        for (const r of keywordResults) {
            if (!seen.has(r.memoryId)) {
                seen.add(r.memoryId);
                merged.push(r);
                scores.push(0.3);
            }
        }
        if (merged.length === 0) {
            for (const r of this.inMemoryRecords) {
                if (!seen.has(r.memoryId) && (r.summary.toLowerCase().includes(q) ||
                    (r.tags || []).some(t => t.toLowerCase().includes(q)))) {
                    seen.add(r.memoryId);
                    merged.push(r);
                    scores.push(0.2);
                }
            }
        }
        return { results: merged.slice(0, options.topK ?? 10), scores };
    }
    count() {
        return this.inMemoryRecords.length;
    }
    clear() {
        this.inMemoryRecords = [];
        if (this.filePath) {
            const state = this.load();
            state.records = this.inMemoryRecords;
            this.save(state);
        }
    }
    destroy() {
        if (this._saveTimeout)
            clearTimeout(this._saveTimeout);
        this.disconnectEventBus();
        this.releaseLock();
    }
}
exports.MemoryStore = MemoryStore;
//# sourceMappingURL=memory-store.js.map