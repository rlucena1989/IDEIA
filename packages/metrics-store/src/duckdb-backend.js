"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DuckDbBackend = void 0;
const logger_1 = require("@ideia/logger");
const fs_1 = require("fs");
const path_1 = require("path");
class DuckDbBackend {
    logger = (0, logger_1.createLogger)('duckdb-backend');
    available;
    db;
    dbPath;
    constructor(dbPath) {
        this.dbPath = (0, path_1.resolve)(dbPath ?? '.ai/metrics/duckdb-fallback.json');
        this.db = {};
        this.available = false;
        this.initialize();
    }
    initialize() {
        try {
            require('duckdb');
            this.available = true;
            this.logger.info('DuckDB backend available');
        }
        catch {
            this.logger.warn('DuckDB not installed, using JSON file fallback');
            this.loadFromDisk();
        }
    }
    isAvailable() {
        return this.available;
    }
    async record(category, key, value, tags) {
        const entry = { key, value, tags, timestamp: Date.now() };
        const entries = this.db[category] ?? [];
        entries.push(entry);
        if (entries.length > 10000)
            entries.splice(0, entries.length - 10000);
        this.db[category] = entries;
        if (!this.available)
            this.persistToDisk();
    }
    async query(category, from, to) {
        const entries = this.db[category] ?? [];
        return entries.filter(e => e.timestamp >= (from ?? 0) && e.timestamp <= (to ?? Date.now()));
    }
    async queryMetrics(name, from, to, aggregation) {
        const allEntries = [];
        for (const category of Object.keys(this.db)) {
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
    async listCategories() {
        return Object.keys(this.db);
    }
    async getTotalMetrics() {
        return Object.values(this.db).reduce((sum, arr) => sum + arr.length, 0);
    }
    aggregate(values, aggregation) {
        if (values.length === 0)
            return 0;
        switch (aggregation) {
            case 'avg': return values.reduce((a, b) => a + b, 0) / values.length;
            case 'max': return Math.max(...values);
            case 'min': return Math.min(...values);
            case 'p95': return this.percentile(values, 95);
            case 'sum': return values.reduce((a, b) => a + b, 0);
            case 'count': return values.length;
            default: return values.reduce((a, b) => a + b, 0) / values.length;
        }
    }
    percentile(sorted, p) {
        if (sorted.length === 0)
            return 0;
        const sortedVals = [...sorted].sort((a, b) => a - b);
        const idx = Math.ceil((p / 100) * sortedVals.length) - 1;
        return sortedVals[Math.max(0, idx)];
    }
    loadFromDisk() {
        try {
            if ((0, fs_1.existsSync)(this.dbPath)) {
                this.db = JSON.parse((0, fs_1.readFileSync)(this.dbPath, 'utf-8'));
            }
        }
        catch {
            this.db = {};
        }
    }
    persistToDisk() {
        try {
            const dir = (0, path_1.dirname)(this.dbPath);
            if (!(0, fs_1.existsSync)(dir))
                (0, fs_1.mkdirSync)(dir, { recursive: true });
            (0, fs_1.writeFileSync)(this.dbPath, JSON.stringify(this.db), 'utf-8');
        }
        catch {
            /* silent */
        }
    }
}
exports.DuckDbBackend = DuckDbBackend;
//# sourceMappingURL=duckdb-backend.js.map