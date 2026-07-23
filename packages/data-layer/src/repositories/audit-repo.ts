import { BaseRepository } from './base-repo';

export interface AuditRecord {
  id: string;
  actor: string;
  eventType: string;
  target?: string;
  decision: string;
  result: string;
  metadata?: Record<string, unknown>;
  previousHash?: string;
  createdAt: string;
}

export interface AuditQuery {
  eventType?: string;
  actor?: string;
  decision?: string;
  fromDate?: string;
  toDate?: string;
  limit?: number;
  offset?: number;
}

export class AuditRepository extends BaseRepository {
  async ensureTable(): Promise<void> {
    const sql = this.dbType === 'postgres' ? `
      CREATE TABLE IF NOT EXISTS ideia_audit_log (
        id UUID PRIMARY KEY,
        actor TEXT NOT NULL,
        event_type TEXT NOT NULL,
        target TEXT,
        decision TEXT NOT NULL,
        result TEXT NOT NULL,
        metadata JSONB DEFAULT '{}',
        previous_hash TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_audit_event ON ideia_audit_log(event_type);
      CREATE INDEX IF NOT EXISTS idx_audit_actor ON ideia_audit_log(actor);
      CREATE INDEX IF NOT EXISTS idx_audit_created ON ideia_audit_log(created_at);
    ` : `
      CREATE TABLE IF NOT EXISTS ideia_audit_log (
        id TEXT PRIMARY KEY,
        actor TEXT NOT NULL,
        event_type TEXT NOT NULL,
        target TEXT,
        decision TEXT NOT NULL,
        result TEXT NOT NULL,
        metadata TEXT DEFAULT '{}',
        previous_hash TEXT,
        created_at TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_audit_event ON ideia_audit_log(event_type);
      CREATE INDEX IF NOT EXISTS idx_audit_actor ON ideia_audit_log(actor);
      CREATE INDEX IF NOT EXISTS idx_audit_created ON ideia_audit_log(created_at);
    `;
    await this.adapter.query(sql);
  }

  async insert(record: AuditRecord): Promise<void> {
    await this.adapter.query(
      `INSERT INTO ideia_audit_log (id, actor, event_type, target, decision, result, metadata, previous_hash, created_at)
       VALUES (${this.ph(0)}, ${this.ph(1)}, ${this.ph(2)}, ${this.ph(3)}, ${this.ph(4)}, ${this.ph(5)}, ${this.ph(6)}, ${this.ph(7)}, ${this.ph(8)})`,
      [record.id, record.actor, record.eventType, record.target || null, record.decision, record.result,
       this.param(record.metadata || {}), record.previousHash || null, record.createdAt]
    );
  }

  async findById(id: string): Promise<AuditRecord | null> {
    const result = await this.adapter.query<AuditRecord>(
      `SELECT id, actor, event_type as "eventType", target, decision, result, metadata, previous_hash as "previousHash", created_at as "createdAt"
       FROM ideia_audit_log WHERE id = ${this.ph(0)}`, [id]
    );
    return result.rows[0] || null;
  }

  async query(query: AuditQuery): Promise<AuditRecord[]> {
    const conditions: string[] = [];
    const params: unknown[] = [];

    if (query.eventType) { conditions.push(`event_type = ${this.ph(params.length)}`); params.push(query.eventType); }
    if (query.actor) { conditions.push(`actor = ${this.ph(params.length)}`); params.push(query.actor); }
    if (query.decision) { conditions.push(`decision = ${this.ph(params.length)}`); params.push(query.decision); }
    if (query.fromDate) { conditions.push(`created_at >= ${this.ph(params.length)}`); params.push(query.fromDate); }
    if (query.toDate) { conditions.push(`created_at <= ${this.ph(params.length)}`); params.push(query.toDate); }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const limit = query.limit || 50;
    const offset = query.offset || 0;

    const result = await this.adapter.query<AuditRecord>(
      `SELECT id, actor, event_type as "eventType", target, decision, result, metadata, previous_hash as "previousHash", created_at as "createdAt"
       FROM ideia_audit_log ${where} ORDER BY created_at DESC LIMIT ${this.ph(params.length)} OFFSET ${this.ph(params.length + 1)}`,
      [...params, limit, offset]
    );
    return result.rows;
  }

  async getLatestHash(): Promise<string | null> {
    const result = await this.adapter.query<{ previous_hash: string }>(
      'SELECT previous_hash FROM ideia_audit_log ORDER BY created_at DESC LIMIT 1'
    );
    return result.rows[0]?.previous_hash || null;
  }

  async countByEventType(): Promise<Array<{ eventType: string; count: number }>> {
    const result = await this.adapter.query<{ event_type: string; count: number }>(
      'SELECT event_type, COUNT(*) as count FROM ideia_audit_log GROUP BY event_type ORDER BY count DESC'
    );
    return result.rows.map(r => ({ eventType: r.event_type, count: Number(r.count) }));
  }

  async deleteOlderThan(date: string): Promise<number> {
    const result = await this.adapter.query(
      `DELETE FROM ideia_audit_log WHERE created_at < ${this.ph(0)}`, [date]
    );
    return result.rowCount;
  }
}
