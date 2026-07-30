import { BaseRepository } from './base-repo';
import { createLogger } from '@ideia/logger';
const logger = createLogger('decision-repo');

export interface DecisionRecord {
  id: string;
  actionId: string;
  actionType: string;
  decision: string;
  reason?: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

export interface DecisionQuery {
  actionType?: string;
  decision?: string;
  fromDate?: string;
  toDate?: string;
  limit?: number;
  offset?: number;
}

export class DecisionRepository extends BaseRepository {
  async ensureTable(): Promise<void> {
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

  async insert(record: DecisionRecord): Promise<void> {
    await this.adapter.query(
      `INSERT INTO ideia_decisions (id, action_id, action_type, decision, reason, metadata, created_at)
       VALUES (${this.ph(0)}, ${this.ph(1)}, ${this.ph(2)}, ${this.ph(3)}, ${this.ph(4)}, ${this.ph(5)}, ${this.ph(6)})`,
      [record.id, record.actionId, record.actionType, record.decision, record.reason || null,
       this.param(record.metadata || {}), record.createdAt]
    );
  }

  async findById(id: string): Promise<DecisionRecord | null> {
    const result = await this.adapter.query<DecisionRecord>(
      `SELECT id, action_id as "actionId", action_type as "actionType", decision, reason, metadata, created_at as "createdAt"
       FROM ideia_decisions WHERE id = ${this.ph(0)}`, [id]
    );
    return result.rows[0] || null;
  }

  async query(query: DecisionQuery): Promise<DecisionRecord[]> {
    const conditions: string[] = [];
    const params: unknown[] = [];

    if (query.actionType) { conditions.push(`action_type = ${this.ph(params.length)}`); params.push(query.actionType); }
    if (query.decision) { conditions.push(`decision = ${this.ph(params.length)}`); params.push(query.decision); }
    if (query.fromDate) { conditions.push(`created_at >= ${this.ph(params.length)}`); params.push(query.fromDate); }
    if (query.toDate) { conditions.push(`created_at <= ${this.ph(params.length)}`); params.push(query.toDate); }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const limit = query.limit || 50;
    const offset = query.offset || 0;

    const result = await this.adapter.query<DecisionRecord>(
      `SELECT id, action_id as "actionId", action_type as "actionType", decision, reason, metadata, created_at as "createdAt"
       FROM ideia_decisions ${where} ORDER BY created_at DESC LIMIT ${this.ph(params.length)} OFFSET ${this.ph(params.length + 1)}`,
      [...params, limit, offset]
    );
    return result.rows;
  }

  async count(query?: DecisionQuery): Promise<number> {
    const conditions: string[] = [];
    const params: unknown[] = [];
    if (query?.actionType) { conditions.push(`action_type = ${this.ph(params.length)}`); params.push(query.actionType); }
    if (query?.decision) { conditions.push(`decision = ${this.ph(params.length)}`); params.push(query.decision); }
    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const result = await this.adapter.query<{ count: number }>(
      `SELECT COUNT(*) as count FROM ideia_decisions ${where}`, params
    );
    return Number(result.rows[0]?.count || 0);
  }

  async deleteOlderThan(date: string): Promise<number> {
    const result = await this.adapter.query(
      `DELETE FROM ideia_decisions WHERE created_at < ${this.ph(0)}`, [date]
    );
    return result.rowCount;
  }
}
