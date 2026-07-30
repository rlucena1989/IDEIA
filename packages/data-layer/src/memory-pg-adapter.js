"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MemoryPgAdapter = void 0;
const logger_1 = require("@ideia/logger");
const decision_repo_1 = require("./repositories/decision-repo");
const session_repo_1 = require("./repositories/session-repo");
const logger = (0, logger_1.createLogger)('memory-pg-adapter');
class MemoryPgAdapter {
    adapter;
    decisionRepo;
    sessionRepo;
    dbType;
    constructor(adapter, dbType = 'sqlite') {
        this.adapter = adapter;
        this.dbType = dbType;
        this.decisionRepo = new decision_repo_1.DecisionRepository(adapter, dbType);
        this.sessionRepo = new session_repo_1.SessionRepository(adapter, dbType);
    }
    get decisions() { return this.decisionRepo; }
    get sessions() { return this.sessionRepo; }
    async ensureSchema() {
        await this.decisionRepo.ensureTable();
        await this.sessionRepo.ensureTable();
        const sql = this.dbType === 'postgres' ? `
      CREATE TABLE IF NOT EXISTS ideia_memory (
        id UUID PRIMARY KEY,
        memory_id TEXT UNIQUE NOT NULL,
        category TEXT NOT NULL,
        source TEXT NOT NULL,
        summary TEXT NOT NULL,
        tags JSONB DEFAULT '[]',
        severity TEXT DEFAULT 'low',
        context JSONB DEFAULT '{}',
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_memory_category ON ideia_memory(category);
      CREATE INDEX IF NOT EXISTS idx_memory_severity ON ideia_memory(severity);
      CREATE INDEX IF NOT EXISTS idx_memory_created ON ideia_memory(created_at);
    ` : `
      CREATE TABLE IF NOT EXISTS ideia_memory (
        id TEXT PRIMARY KEY,
        memory_id TEXT UNIQUE NOT NULL,
        category TEXT NOT NULL,
        source TEXT NOT NULL,
        summary TEXT NOT NULL,
        tags TEXT DEFAULT '[]',
        severity TEXT DEFAULT 'low',
        context TEXT DEFAULT '{}',
        created_at TEXT DEFAULT (datetime('now'))
      );
      CREATE INDEX IF NOT EXISTS idx_memory_category ON ideia_memory(category);
      CREATE INDEX IF NOT EXISTS idx_memory_severity ON ideia_memory(severity);
    `;
        await this.adapter.query(sql);
    }
    async insertMemory(record) {
        const params = [record.id, record.memoryId, record.category, record.source,
            record.summary, JSON.stringify(record.tags), record.severity, JSON.stringify(record.context || {})];
        if (this.dbType === 'postgres') {
            params.push(new Date().toISOString());
            await this.adapter.query(`INSERT INTO ideia_memory (id, memory_id, category, source, summary, tags, severity, context, created_at)
         VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7, $8::jsonb, $9)`, params);
        }
        else {
            params.push(new Date().toISOString());
            await this.adapter.query('INSERT INTO ideia_memory (id, memory_id, category, source, summary, tags, severity, context, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)', params);
        }
    }
    async queryMemory(options) {
        const conditions = [];
        const params = [];
        let idx = 0;
        if (options.category) {
            conditions.push(`category = ${this.dbType === 'postgres' ? '$' + (++idx) : '?'}`);
            params.push(options.category);
        }
        if (options.severity) {
            conditions.push(`severity = ${this.dbType === 'postgres' ? '$' + (++idx) : '?'}`);
            params.push(options.severity);
        }
        if (options.source) {
            conditions.push(`source = ${this.dbType === 'postgres' ? '$' + (++idx) : '?'}`);
            params.push(options.source);
        }
        if (options.fromDate) {
            conditions.push(`created_at >= ${this.dbType === 'postgres' ? '$' + (++idx) : '?'}`);
            params.push(options.fromDate);
        }
        if (options.toDate) {
            conditions.push(`created_at <= ${this.dbType === 'postgres' ? '$' + (++idx) : '?'}`);
            params.push(options.toDate);
        }
        const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
        const limit = options.limit || 50;
        const offset = options.offset || 0;
        const limitPh = this.dbType === 'postgres' ? `$${++idx}` : '?';
        params.push(limit);
        const offsetPh = this.dbType === 'postgres' ? `$${++idx}` : '?';
        params.push(offset);
        const result = await this.adapter.query(`SELECT * FROM ideia_memory ${where} ORDER BY created_at DESC LIMIT ${limitPh} OFFSET ${offsetPh}`, params);
        return result.rows;
    }
    async searchMemory(query, limit = 10) {
        if (this.dbType === 'postgres') {
            const result = await this.adapter.query(`SELECT * FROM ideia_memory WHERE summary LIKE $2 OR tags::text LIKE $2 OR source LIKE $2
         ORDER BY created_at DESC LIMIT $1`, [limit, `%${query}%`]);
            return result.rows;
        }
        const likeVal = `%${query}%`;
        const result = await this.adapter.query('SELECT * FROM ideia_memory WHERE summary LIKE ? OR tags LIKE ? OR source LIKE ? ORDER BY created_at DESC LIMIT ?', [likeVal, likeVal, likeVal, limit]);
        return result.rows;
    }
    async countMemory() {
        const result = await this.adapter.query('SELECT COUNT(*) as count FROM ideia_memory');
        return Number(result.rows[0]?.count || 0);
    }
    async deleteMemory(memoryId) {
        const ph = this.dbType === 'postgres' ? '$1' : '?';
        await this.adapter.query(`DELETE FROM ideia_memory WHERE memory_id = ${ph}`, [memoryId]);
    }
    async deleteOlderThan(date) {
        const ph = this.dbType === 'postgres' ? '$1' : '?';
        const result = await this.adapter.query(`DELETE FROM ideia_memory WHERE created_at < ${ph}`, [date]);
        return result.rowCount;
    }
}
exports.MemoryPgAdapter = MemoryPgAdapter;
//# sourceMappingURL=memory-pg-adapter.js.map