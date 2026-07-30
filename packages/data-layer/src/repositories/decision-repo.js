"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DecisionRepository = void 0;
const base_repo_1 = require("./base-repo");
const logger_1 = require("@ideia/logger");
const logger = (0, logger_1.createLogger)('decision-repo');
class DecisionRepository extends base_repo_1.BaseRepository {
    async ensureTable() {
        const sql = this.dbType === 'postgres' ? `
      CREATE TABLE IF NOT EXISTS ideia_decisions (
        id UUID PRIMARY KEY,
        action_id TEXT NOT NULL,
        action_type TEXT NOT NULL,
        decision TEXT NOT NULL,
        reason TEXT,
        metadata JSONB DEFAULT '{}',
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_decisions_action ON ideia_decisions(action_id);
      CREATE INDEX IF NOT EXISTS idx_decisions_type ON ideia_decisions(action_type);
    ` : `
      CREATE TABLE IF NOT EXISTS ideia_decisions (
        id TEXT PRIMARY KEY,
        action_id TEXT NOT NULL,
        action_type TEXT NOT NULL,
        decision TEXT NOT NULL,
        reason TEXT,
        metadata TEXT DEFAULT '{}',
        created_at TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_decisions_action ON ideia_decisions(action_id);
      CREATE INDEX IF NOT EXISTS idx_decisions_type ON ideia_decisions(action_type);
    `;
        await this.adapter.query(sql);
    }
    async insert(record) {
        await this.adapter.query(`INSERT INTO ideia_decisions (id, action_id, action_type, decision, reason, metadata, created_at)
       VALUES (${this.ph(0)}, ${this.ph(1)}, ${this.ph(2)}, ${this.ph(3)}, ${this.ph(4)}, ${this.ph(5)}, ${this.ph(6)})`, [record.id, record.actionId, record.actionType, record.decision, record.reason || null,
            this.param(record.metadata || {}), record.createdAt]);
    }
    async findById(id) {
        const result = await this.adapter.query(`SELECT id, action_id as "actionId", action_type as "actionType", decision, reason, metadata, created_at as "createdAt"
       FROM ideia_decisions WHERE id = ${this.ph(0)}`, [id]);
        return result.rows[0] || null;
    }
    async query(query) {
        const conditions = [];
        const params = [];
        if (query.actionType) {
            conditions.push(`action_type = ${this.ph(params.length)}`);
            params.push(query.actionType);
        }
        if (query.decision) {
            conditions.push(`decision = ${this.ph(params.length)}`);
            params.push(query.decision);
        }
        if (query.fromDate) {
            conditions.push(`created_at >= ${this.ph(params.length)}`);
            params.push(query.fromDate);
        }
        if (query.toDate) {
            conditions.push(`created_at <= ${this.ph(params.length)}`);
            params.push(query.toDate);
        }
        const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
        const limit = query.limit || 50;
        const offset = query.offset || 0;
        const result = await this.adapter.query(`SELECT id, action_id as "actionId", action_type as "actionType", decision, reason, metadata, created_at as "createdAt"
       FROM ideia_decisions ${where} ORDER BY created_at DESC LIMIT ${this.ph(params.length)} OFFSET ${this.ph(params.length + 1)}`, [...params, limit, offset]);
        return result.rows;
    }
    async count(query) {
        const conditions = [];
        const params = [];
        if (query?.actionType) {
            conditions.push(`action_type = ${this.ph(params.length)}`);
            params.push(query.actionType);
        }
        if (query?.decision) {
            conditions.push(`decision = ${this.ph(params.length)}`);
            params.push(query.decision);
        }
        const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
        const result = await this.adapter.query(`SELECT COUNT(*) as count FROM ideia_decisions ${where}`, params);
        return Number(result.rows[0]?.count || 0);
    }
    async deleteOlderThan(date) {
        const result = await this.adapter.query(`DELETE FROM ideia_decisions WHERE created_at < ${this.ph(0)}`, [date]);
        return result.rowCount;
    }
}
exports.DecisionRepository = DecisionRepository;
//# sourceMappingURL=decision-repo.js.map