"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuditTrail = void 0;
const promises_1 = __importDefault(require("fs/promises"));
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const crypto_1 = __importDefault(require("crypto"));
const logger_1 = require("@ideia/logger");
const log = (0, logger_1.createLogger)('audit-trail');
const MAX_BYTES = 10 * 1024 * 1024;
function hashEvent(event) {
    const { previousHash, ...rest } = event;
    const data = previousHash
        ? JSON.stringify({ ...rest, previousHash }, Object.keys({ ...rest, previousHash }).sort())
        : JSON.stringify(rest, Object.keys(rest).sort());
    return crypto_1.default.createHash('sha256').update(data).digest('hex');
}
class AuditTrail {
    filePath;
    lineCache = null;
    eventCache = null;
    indexByEventType = new Map();
    indexByActor = new Map();
    indexByTarget = new Map();
    eventQueue = Promise.resolve();
    constructor(filePath) {
        this.filePath = filePath;
        this.eventCache = [];
    }
    rebuildIndexes(events) {
        this.indexByEventType.clear();
        this.indexByActor.clear();
        this.indexByTarget.clear();
        for (const event of events) {
            const typeKey = event.eventType || 'unknown';
            const typeList = this.indexByEventType.get(typeKey);
            if (typeList)
                typeList.push(event);
            else
                this.indexByEventType.set(typeKey, [event]);
            const actorKey = event.actor || 'unknown';
            const actorList = this.indexByActor.get(actorKey);
            if (actorList)
                actorList.push(event);
            else
                this.indexByActor.set(actorKey, [event]);
            const targetKey = event.target || 'unknown';
            const targetList = this.indexByTarget.get(targetKey);
            if (targetList)
                targetList.push(event);
            else
                this.indexByTarget.set(targetKey, [event]);
        }
    }
    append(event) {
        const full = {
            eventId: crypto_1.default.randomUUID(),
            timestamp: new Date().toISOString(),
            ...event,
        };
        const pendingHash = this.getLastHashSync();
        if (pendingHash) {
            full.previousHash = pendingHash;
        }
        const h = hashEvent(full);
        this.persistAsync(full, h);
        if (this.lineCache !== null)
            this.lineCache++;
        if (this.eventCache) {
            this.eventCache.push(full);
            this.rebuildIndexes(this.eventCache);
        }
        return full;
    }
    persistAsync(full, hash) {
        this.eventQueue = this.eventQueue
            .then(() => promises_1.default.mkdir(path_1.default.dirname(this.filePath), { recursive: true }))
            .then(() => this.rotateIfNeededAsync())
            .then(() => promises_1.default.appendFile(this.filePath, JSON.stringify(full) + '\n', 'utf-8'))
            .then(() => promises_1.default.appendFile(this.filePath + '.hash', hash + '\n', 'utf-8'))
            .catch(err => log.error('Failed to persist audit event', { error: err.message }));
    }
    load() {
        if (this.eventCache)
            return this.eventCache;
        if (!fs_1.default.existsSync(this.filePath))
            return [];
        try {
            const content = fs_1.default.readFileSync(this.filePath, 'utf-8');
            const lines = content.split('\n').filter(l => l.trim().length > 0);
            this.lineCache = lines.length;
            this.eventCache = lines.map(line => {
                try {
                    return JSON.parse(line);
                }
                catch {
                    return null;
                }
            }).filter((e) => e !== null);
            this.rebuildIndexes(this.eventCache);
            return this.eventCache;
        }
        catch (_err) {
            log.error('Failed to load audit file, renaming to .corrupted', { error: String(_err) });
            promises_1.default.rename(this.filePath, this.filePath + '.corrupted').catch(() => { });
            return [];
        }
    }
    async query(filter) {
        const events = this.load();
        const filterKeys = Object.keys(filter);
        if (filterKeys.length === 1) {
            const key = filterKeys[0];
            const value = String(filter[key]);
            if (key === 'eventType' && this.indexByEventType.has(value)) {
                return [...this.indexByEventType.get(value) ?? []];
            }
            if (key === 'actor' && this.indexByActor.has(value)) {
                return [...this.indexByActor.get(value) ?? []];
            }
            if (key === 'target' && this.indexByTarget.has(value)) {
                return [...this.indexByTarget.get(value) ?? []];
            }
        }
        return events.filter((e) => {
            for (const [key, value] of Object.entries(filter)) {
                if (!(key in e) || e[key] !== value)
                    return false;
            }
            return true;
        });
    }
    async loadAsync() {
        const cached = this.load();
        if (cached.length > 0)
            return cached;
        try {
            const content = await promises_1.default.readFile(this.filePath, 'utf-8');
            const lines = content.split('\n').filter(l => l.trim().length > 0);
            this.lineCache = lines.length;
            this.eventCache = lines.map(line => {
                try {
                    return JSON.parse(line);
                }
                catch {
                    return null;
                }
            }).filter((e) => e !== null);
            this.rebuildIndexes(this.eventCache);
            return this.eventCache;
        }
        catch {
            return [];
        }
    }
    count() {
        if (this.lineCache !== null)
            return this.lineCache;
        return this.load().length;
    }
    verifyChain() {
        const events = this.load();
        if (events.length === 0) {
            return { valid: true, totalEvents: 0, breakAtIndex: null, breakReason: null, currentTipHash: null };
        }
        for (let i = 0; i < events.length; i++) {
            const current = events[i];
            if (i > 0) {
                const expectedHash = hashEvent(events[i - 1]);
                if (current.previousHash !== expectedHash) {
                    return {
                        valid: false,
                        totalEvents: events.length,
                        breakAtIndex: i,
                        breakReason: `Event ${i} references previousHash ${current.previousHash} but event ${i - 1} hash is ${expectedHash}`,
                        currentTipHash: hashEvent(events[events.length - 1]),
                    };
                }
            }
        }
        return {
            valid: true,
            totalEvents: events.length,
            breakAtIndex: null,
            breakReason: null,
            currentTipHash: hashEvent(events[events.length - 1]),
        };
    }
    proveEntry(eventId) {
        const events = this.load();
        const idx = events.findIndex(e => e.eventId === eventId);
        if (idx === -1)
            return null;
        const entryHash = hashEvent(events[idx]);
        const rootHash = events.length > 0 ? hashEvent(events[events.length - 1]) : entryHash;
        const siblings = [];
        for (let i = 0; i < events.length; i++) {
            if (i !== idx)
                siblings.push(hashEvent(events[i]));
        }
        return { entryIndex: idx, entryHash, siblings, rootHash };
    }
    verifyEntryInclusion(proof) {
        const events = this.load();
        if (proof.entryIndex < 0 || proof.entryIndex >= events.length)
            return false;
        const actualHash = hashEvent(events[proof.entryIndex]);
        if (actualHash !== proof.entryHash)
            return false;
        const rootHash = events.length > 0 ? hashEvent(events[events.length - 1]) : '';
        return rootHash === proof.rootHash;
    }
    getMerkleRoot() {
        const events = this.load();
        if (events.length === 0)
            return crypto_1.default.createHash('sha256').update('empty').digest('hex');
        return hashEvent(events[events.length - 1]);
    }
    getChainGaps() {
        const events = this.load();
        const gaps = [];
        for (let i = 1; i < events.length; i++) {
            const expectedPrevHash = hashEvent(events[i - 1]);
            if (events[i].previousHash !== expectedPrevHash) {
                gaps.push({ index: i, eventId: events[i].eventId });
            }
        }
        return gaps;
    }
    scheduleVerification(intervalMs) {
        let stopped = false;
        const id = setInterval(() => {
            if (!stopped)
                this.verifyChain();
        }, intervalMs);
        return {
            stop: () => {
                stopped = true;
                clearInterval(id);
            },
        };
    }
    getChainTipHash() {
        const events = this.load();
        if (events.length === 0)
            return null;
        return hashEvent(events[events.length - 1]);
    }
    getLastHashSync() {
        if (this.eventCache && this.eventCache.length > 0) {
            return hashEvent(this.eventCache[this.eventCache.length - 1]);
        }
        try {
            if (!fs_1.default.existsSync(this.filePath))
                return null;
            const content = fs_1.default.readFileSync(this.filePath, 'utf-8');
            const lines = content.trim().split('\n').filter(l => l.length > 0);
            if (lines.length === 0)
                return null;
            const lastEvent = JSON.parse(lines[lines.length - 1]);
            return hashEvent(lastEvent);
        }
        catch {
            return null;
        }
    }
    async rotateIfNeededAsync() {
        try {
            const stats = await promises_1.default.stat(this.filePath).catch(() => null);
            if (stats && stats.size > MAX_BYTES) {
                const archivePath = this.filePath + '.' + Date.now() + '.audit';
                await promises_1.default.rename(this.filePath, archivePath);
                const hashPath = this.filePath + '.hash';
                try {
                    await promises_1.default.access(hashPath);
                    await promises_1.default.rename(hashPath, archivePath + '.hash');
                }
                catch {
                    log.debug('No hash file to rotate');
                }
            }
        }
        catch (_err) {
            log.debug('Rotation check failed', { error: String(_err) });
        }
    }
}
exports.AuditTrail = AuditTrail;
//# sourceMappingURL=audit-trail.js.map