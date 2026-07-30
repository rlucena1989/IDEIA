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
exports.SqliteBackend = void 0;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const logger_1 = require("@ideia/logger");
class SqliteBackend {
    storageDir;
    cache;
    logger = (0, logger_1.createLogger)('sqlite-backend');
    constructor(storageDir) {
        this.storageDir = storageDir ?? path.join(process.cwd(), '.ai', 'metrics');
        this.cache = new Map();
        fs.mkdirSync(this.storageDir, { recursive: true });
    }
    async record(category, key, value, tags) {
        const entry = { key, value, tags, timestamp: Date.now() };
        const entries = this.cache.get(category) ?? [];
        entries.push(entry);
        this.cache.set(category, entries);
        await this.flushCategory(category);
    }
    async query(category, from, to) {
        await this.loadCategory(category);
        const entries = this.cache.get(category) ?? [];
        return entries.filter(e => e.timestamp >= (from ?? 0) && e.timestamp <= (to ?? Date.now()));
    }
    async queryMetrics(name, from, to, aggregation) {
        const allEntries = [];
        for (const [category] of this.cache) {
            const entries = await this.query(category, from, to);
            allEntries.push(...entries.filter(e => e.key === name));
        }
        const values = allEntries.map(e => e.value);
        if (values.length === 0) {
            return { name, from, to, aggregation, value: 0, count: 0 };
        }
        const value = this.aggregate(values, aggregation);
        return { name, from, to, aggregation, value, count: values.length };
    }
    async prune(olderThan) {
        const cutoff = Date.now() - olderThan;
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
            this.logger.info(`Pruned ${removed} entries older than ${olderThan}ms`);
        }
        return removed;
    }
    async close() {
        for (const [category] of this.cache) {
            await this.flushCategory(category);
        }
        this.cache.clear();
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
            this.cache.set(category, JSON.parse(content));
        }
        else {
            this.cache.set(category, []);
        }
    }
    aggregate(values, type) {
        switch (type) {
            case 'avg':
                return values.reduce((a, b) => a + b, 0) / values.length;
            case 'max':
                return Math.max(...values);
            case 'min':
                return Math.min(...values);
            case 'p95': {
                const sorted = [...values].sort((a, b) => a - b);
                const idx = Math.ceil(0.95 * sorted.length) - 1;
                return sorted[Math.max(0, idx)];
            }
        }
    }
}
exports.SqliteBackend = SqliteBackend;
//# sourceMappingURL=sqlite-backend.js.map