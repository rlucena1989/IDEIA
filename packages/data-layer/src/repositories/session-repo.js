"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SessionRepository = void 0;
const base_repo_1 = require("./base-repo");
const logger_1 = require("@ideia/logger");
const logger = (0, logger_1.createLogger)('session-repo');
class SessionRepository extends base_repo_1.BaseRepository {
    async ensureTable() {
        const sql = this.dbType === 'postgres' ? `
      CREATE TABLE IF NOT EXISTS ideia_sessions (
        id UUID PRIMARY KEY,
        workspace_root TEXT NOT NULL,
        status TEXT DEFAULT 'active',
        metadata JSONB DEFAULT '{}',
        started_at TIMESTAMPTZ DEFAULT NOW(),
        ended_at TIMESTAMPTZ
      );
      CREATE INDEX IF NOT EXISTS idx_sessions_status ON ideia_sessions(status);
    ` : `
      CREATE TABLE IF NOT EXISTS ideia_sessions (
        id TEXT PRIMARY KEY,
        workspace_root TEXT NOT NULL,
        status TEXT DEFAULT 'active',
        metadata TEXT DEFAULT '{}',
        started_at TEXT NOT NULL,
        ended_at TEXT
      );
      CREATE INDEX IF NOT EXISTS idx_sessions_status ON ideia_sessions(status);
    `;
        await this.adapter.query(sql);
    }
    async insert(session) {
        await this.adapter.query(`INSERT INTO ideia_sessions (id, workspace_root, status, metadata, started_at)
       VALUES (${this.ph(0)}, ${this.ph(1)}, ${this.ph(2)}, ${this.ph(3)}, ${this.ph(4)})`, [session.id, session.workspaceRoot, session.status, this.param(session.metadata || {}), session.startedAt]);
    }
    async findById(id) {
        const result = await this.adapter.query(`SELECT id, workspace_root as "workspaceRoot", status, metadata, started_at as "startedAt", ended_at as "endedAt"
       FROM ideia_sessions WHERE id = ${this.ph(0)}`, [id]);
        return result.rows[0] || null;
    }
    async findByWorkspace(workspaceRoot, status) {
        const conditions = [`workspace_root = ${this.ph(0)}`];
        const params = [workspaceRoot];
        if (status) {
            conditions.push(`status = ${this.ph(params.length)}`);
            params.push(status);
        }
        const result = await this.adapter.query(`SELECT id, workspace_root as "workspaceRoot", status, metadata, started_at as "startedAt", ended_at as "endedAt"
       FROM ideia_sessions WHERE ${conditions.join(' AND ')} ORDER BY started_at DESC`);
        return result.rows;
    }
    async endSession(id) {
        const endedAt = this.dbType === 'postgres' ? 'NOW()' : "datetime('now')";
        await this.adapter.query(`UPDATE ideia_sessions SET status = 'ended', ended_at = ${endedAt} WHERE id = ${this.ph(0)}`, [id]);
    }
    async updateMetadata(id, metadata) {
        await this.adapter.query(`UPDATE ideia_sessions SET metadata = ${this.ph(0)} WHERE id = ${this.ph(1)}`, [this.param(metadata), id]);
    }
    async countActive() {
        const result = await this.adapter.query("SELECT COUNT(*) as count FROM ideia_sessions WHERE status = 'active'");
        return Number(result.rows[0]?.count || 0);
    }
}
exports.SessionRepository = SessionRepository;
//# sourceMappingURL=session-repo.js.map