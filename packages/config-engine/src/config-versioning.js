"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConfigVersioning = void 0;
const promises_1 = __importDefault(require("fs/promises"));
const path_1 = __importDefault(require("path"));
const crypto_1 = require("crypto");
const logger_1 = require("@ideia/logger");
const log = (0, logger_1.createLogger)('config-versioning');
const HISTORY_DIR = path_1.default.join('.ai', 'config-history');
const INDEX_FILE = 'index.json';
function flattenKeys(obj, prefix = '') {
    const result = {};
    for (const [key, value] of Object.entries(obj)) {
        const fullKey = prefix ? `${prefix}.${key}` : key;
        if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
            Object.assign(result, flattenKeys(value, fullKey));
        }
        else {
            result[fullKey] = value;
        }
    }
    return result;
}
function computeDiff(from, to) {
    const flatFrom = flattenKeys(from);
    const flatTo = flattenKeys(to);
    const changes = [];
    const allKeys = new Set([...Object.keys(flatFrom), ...Object.keys(flatTo)]);
    for (const key of allKeys) {
        const oldVal = flatFrom[key];
        const newVal = flatTo[key];
        if (oldVal === undefined && newVal !== undefined) {
            changes.push({ path: key, oldValue: undefined, newValue: newVal, operation: 'added' });
        }
        else if (oldVal !== undefined && newVal === undefined) {
            changes.push({ path: key, oldValue: oldVal, newValue: undefined, operation: 'removed' });
        }
        else if (JSON.stringify(oldVal) !== JSON.stringify(newVal)) {
            changes.push({ path: key, oldValue: oldVal, newValue: newVal, operation: 'modified' });
        }
    }
    return changes;
}
function getIndexPath() {
    return path_1.default.join(HISTORY_DIR, INDEX_FILE);
}
async function readIndex() {
    try {
        const content = await promises_1.default.readFile(getIndexPath(), 'utf-8');
        return JSON.parse(content);
    }
    catch {
        return { snapshots: [] };
    }
}
async function writeIndex(index) {
    await promises_1.default.mkdir(HISTORY_DIR, { recursive: true });
    await promises_1.default.writeFile(getIndexPath(), JSON.stringify(index, null, 2), 'utf-8');
}
class ConfigVersioning {
    configProvider;
    snapshots = [];
    constructor(configProvider) {
        this.configProvider = configProvider;
    }
    async initialize() {
        const index = await readIndex();
        this.snapshots = index.snapshots;
    }
    async save(name) {
        const config = this.configProvider();
        const id = (0, crypto_1.randomUUID)();
        const snapshot = {
            id,
            name,
            timestamp: new Date().toISOString(),
            config: config,
        };
        const filePath = path_1.default.join(HISTORY_DIR, `${id}.json`);
        await promises_1.default.mkdir(HISTORY_DIR, { recursive: true });
        await promises_1.default.writeFile(filePath, JSON.stringify(snapshot, null, 2), 'utf-8');
        this.snapshots.push(snapshot);
        await writeIndex({ snapshots: this.snapshots });
        log.info(`Snapshot saved: ${name} (${id})`);
        return id;
    }
    list() {
        return [...this.snapshots].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    }
    diff(v1, v2) {
        const s1 = this.snapshots.find(s => s.id === v1);
        const s2 = this.snapshots.find(s => s.id === v2);
        if (!s1)
            throw new Error(`Snapshot not found: ${v1}`);
        if (!s2)
            throw new Error(`Snapshot not found: ${v2}`);
        const changes = computeDiff(s1.config, s2.config);
        return { from: v1, to: v2, changes };
    }
    async rollback(id) {
        const snapshot = this.snapshots.find(s => s.id === id);
        if (!snapshot)
            throw new Error(`Snapshot not found: ${id}`);
        const configPath = path_1.default.join('.ideia', 'config.json');
        await promises_1.default.mkdir(path_1.default.dirname(configPath), { recursive: true });
        await promises_1.default.writeFile(configPath, JSON.stringify(snapshot.config, null, 2), 'utf-8');
        log.info(`Rolled back to snapshot: ${snapshot.name} (${id})`);
    }
    history() {
        return [...this.snapshots].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
    }
    async loadFromDisk() {
        const index = await readIndex();
        this.snapshots = index.snapshots;
        return [...this.snapshots];
    }
    getHistory() {
        return this.history();
    }
    getVersion(id) {
        return this.snapshots.find(s => s.id === id);
    }
    describe(id) {
        const snapshot = this.snapshots.find(s => s.id === id);
        if (!snapshot)
            return null;
        const flatFrom = flattenKeys(snapshot.config);
        const prevIdx = this.snapshots.indexOf(snapshot) - 1;
        let changes = 0;
        if (prevIdx >= 0) {
            const prev = this.snapshots[prevIdx];
            changes = computeDiff(prev.config, snapshot.config).length;
        }
        return {
            date: snapshot.timestamp,
            size: JSON.stringify(snapshot.config).length,
            changes,
            name: snapshot.name,
        };
    }
    async prune(keep) {
        const sorted = [...this.snapshots].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
        const toRemove = sorted.slice(keep);
        for (const snap of toRemove) {
            const filePath = path_1.default.join(HISTORY_DIR, `${snap.id}.json`);
            try {
                await promises_1.default.unlink(filePath);
            }
            catch { /* ignore */ }
            this.snapshots = this.snapshots.filter(s => s.id !== snap.id);
        }
        await writeIndex({ snapshots: this.snapshots });
        log.info(`Pruned ${toRemove.length} snapshots, keeping ${keep}`);
    }
    compare(id1, id2) {
        const diff = this.diff(id1, id2);
        if (diff.changes.length === 0)
            return 'No differences';
        return diff.changes.map(c => {
            const op = c.operation === 'added' ? '+' : c.operation === 'removed' ? '-' : '~';
            return `${op} ${c.path}: ${JSON.stringify(c.oldValue)} → ${JSON.stringify(c.newValue)}`;
        }).join('\n');
    }
}
exports.ConfigVersioning = ConfigVersioning;
//# sourceMappingURL=config-versioning.js.map