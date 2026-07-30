"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.MetricsStore = void 0;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
class MetricsStore {
    bus;
    logger;
    storageDir;
    cache;
    ttlMs;
    backend;
    constructor(bus, logger, options) {
        this.backend = options?.backend ?? null;
        this.bus = bus;
        this.logger = logger;
        this.storageDir = options?.storageDir ?? path.join(process.cwd(), '.ai', 'metrics');
        this.ttlMs = options?.ttlMs ?? 30 * 24 * 60 * 60 * 1000;
        this.cache = new Map();
        if (!fs.existsSync(this.storageDir)) {
            fs.mkdirSync(this.storageDir, { recursive: true });
        }
    }
    async record(category, key, value, tags) {
        const entry = {
            key,
            value,
            tags,
            timestamp: Date.now(),
        };
        const entries = this.cache.get(category) ?? [];
        entries.push(entry);
        this.cache.set(category, entries);
        await this.flushCategory(category);
        await this.bus.emit({ type: 'metrics.recorded', source: 'metrics-store', payload: { category, key, value } });
        this.logger.debug(`Metric [${category}] ${key} = ${value}`);
    }
    async query(category, from, to) {
        await this.loadCategory(category);
        const entries = this.cache.get(category) ?? [];
        const toValue = to ?? Date.now();
        const fromValue = from ?? 0;
        return entries.filter(e => e.timestamp >= fromValue && e.timestamp <= toValue);
    }
    async getTrend(category, key, window) {
        const entries = await this.query(category, Date.now() - (window ?? 86400000));
        const filtered = entries.filter(e => e.key === key);
        const values = filtered.map(e => e.value);
        const timestamps = filtered.map(e => e.timestamp);
        if (values.length === 0) {
            return { category, key, values: [], timestamps: [], min: 0, max: 0, avg: 0, slope: 0 };
        }
        const min = Math.min(...values);
        const max = Math.max(...values);
        const avg = values.reduce((a, b) => a + b, 0) / values.length;
        const slope = values.length > 1
            ? (values[values.length - 1] - values[0]) / values.length
            : 0;
        return { category, key, values, timestamps, min, max, avg, slope };
    }
    async getLatest(category) {
        const entries = await this.query(category);
        return entries.length > 0 ? entries[entries.length - 1] : undefined;
    }
    async getSummary() {
        const categories = {};
        let totalEntries = 0;
        let oldestEntry = Infinity;
        let newestEntry = 0;
        const files = fs.readdirSync(this.storageDir).filter(f => f.endsWith('.json'));
        for (const file of files) {
            const category = file.replace('.json', '');
            await this.loadCategory(category);
            const entries = this.cache.get(category) ?? [];
            categories[category] = entries.length;
            totalEntries += entries.length;
            for (const e of entries) {
                if (e.timestamp < oldestEntry)
                    oldestEntry = e.timestamp;
                if (e.timestamp > newestEntry)
                    newestEntry = e.timestamp;
            }
        }
        return {
            totalEntries,
            categories,
            oldestEntry: oldestEntry === Infinity ? 0 : oldestEntry,
            newestEntry,
            storagePath: this.storageDir,
        };
    }
    async cleanup() {
        const cutoff = Date.now() - this.ttlMs;
        let removed = 0;
        for (const [category, entries] of this.cache) {
            const filtered = entries.filter(e => e.timestamp >= cutoff);
            removed += entries.length - filtered.length;
            this.cache.set(category, filtered);
        }
        const files = fs.readdirSync(this.storageDir).filter(f => f.endsWith('.json'));
        for (const file of files) {
            const filePath = path.join(this.storageDir, file);
            const content = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
            const filtered = content.filter(e => e.timestamp >= cutoff);
            if (filtered.length !== content.length) {
                fs.writeFileSync(filePath, JSON.stringify(filtered, null, 2));
                removed += content.length - filtered.length;
            }
        }
        if (removed > 0) {
            this.logger.info(`Cleaned up ${removed} expired metric entries`);
        }
        return removed;
    }
    async getDashboardMetrics() {
        const summary = await this.getSummary();
        const cards = [
            { label: 'Total Entries', value: summary.totalEntries, change: 0, trend: 'stable' },
        ];
        for (const [category, count] of Object.entries(summary.categories)) {
            cards.push({ label: `Category: ${category}`, value: count, change: 0, trend: 'stable' });
        }
        return cards;
    }
    async flushCategory(category) {
        const entries = this.cache.get(category);
        if (!entries)
            return;
        const filePath = path.join(this.storageDir, `${category}.json`);
        fs.writeFileSync(filePath, JSON.stringify(entries, null, 2));
    }
    async loadCategory(category) {
        if (this.cache.has(category))
            return;
        const filePath = path.join(this.storageDir, `${category}.json`);
        if (fs.existsSync(filePath)) {
            const content = fs.readFileSync(filePath, 'utf-8');
            const entries = JSON.parse(content);
            this.cache.set(category, entries);
        }
        else {
            this.cache.set(category, []);
        }
    }
}
exports.MetricsStore = MetricsStore;
//# sourceMappingURL=metrics-store.js.map