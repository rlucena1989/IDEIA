import { DatabaseAdapter } from './types';
import { createLogger } from '@ideia/logger';
import { AuditRepository } from './repositories/audit-repo';
const logger = createLogger('audit-pg-adapter');

export class AuditPgAdapter {
  private adapter: DatabaseAdapter;
  private auditRepo: AuditRepository;
  private dbType: 'postgres' | 'sqlite';

  constructor(adapter: DatabaseAdapter, dbType: 'postgres' | 'sqlite' = 'sqlite') {
    this.adapter = adapter;
    this.dbType = dbType;
    this.auditRepo = new AuditRepository(adapter, dbType);
  }

  get repo(): AuditRepository { return this.auditRepo; }

  async ensureSchema(): Promise<void> {
    await this.auditRepo.ensureTable();

    const sql = this.dbType === 'postgres' ? `
      CREATE TABLE IF NOT EXISTS ideia_audit_chain (
        id UUID PRIMARY KEY,
        event_id TEXT UNIQUE NOT NULL,
        hash TEXT NOT NULL,
        previous_hash TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_audit_chain_hash ON ideia_audit_chain(hash);
    ` : `
      CREATE TABLE IF NOT EXISTS ideia_audit_chain (
        id TEXT PRIMARY KEY,
        event_id TEXT UNIQUE NOT NULL,
        hash TEXT NOT NULL,
        previous_hash TEXT,
        created_at TEXT DEFAULT (datetime('now'))
      );
      CREATE INDEX IF NOT EXISTS idx_audit_chain_hash ON ideia_audit_chain(hash);
    `;
    await this.adapter.query(sql);
  }

  async recordHash(eventId: string, hash: string, previousHash: string | null): Promise<void> {
    const id = crypto.randomUUID();
    const ph1 = this.dbType === 'postgres' ? '$1' : '?';
    const ph2 = this.dbType === 'postgres' ? '$2' : '?';
    const ph3 = this.dbType === 'postgres' ? '$3' : '?';
    const ph4 = this.dbType === 'postgres' ? '$4' : '?';
    const ph5 = this.dbType === 'postgres' ? '$5' : '?';
    await this.adapter.query(
      `INSERT INTO ideia_audit_chain (id, event_id, hash, previous_hash, created_at)
       VALUES (${ph1}, ${ph2}, ${ph3}, ${ph4}, ${ph5})`,
      [id, eventId, hash, previousHash, new Date().toISOString()]
    );
  }

  async verifyChain(): Promise<{
    valid: boolean; totalEvents: number; breakAtIndex: number | null; breakReason: string | null;
  }> {
    const _ph = this.dbType === 'postgres' ? '$1' : '?';
    const result = await this.adapter.query<{ id: string; event_id: string; hash: string; previous_hash: string | null }>(
      `SELECT id, event_id, hash, previous_hash FROM ideia_audit_chain ORDER BY created_at ASC`
    );
    const rows = result.rows;
    if (rows.length === 0) return { valid: true, totalEvents: 0, breakAtIndex: null, breakReason: null };

    for (let i = 0; i < rows.length; i++) {
      const prev = i > 0 ? rows[i - 1] : null;
      if (prev && rows[i].previous_hash !== prev.hash) {
        return {
          valid: false, totalEvents: rows.length, breakAtIndex: i,
          breakReason: `Hash mismatch at index ${i}: expected ${prev.hash}, got ${rows[i].previous_hash}`,
        };
      }
    }
    return { valid: true, totalEvents: rows.length, breakAtIndex: null, breakReason: null };
  }

  async getLatestHash(): Promise<string | null> {
    const _ph = this.dbType === 'postgres' ? '$1' : '?';
    const result = await this.adapter.query<{ hash: string }>(
      `SELECT hash FROM ideia_audit_chain ORDER BY created_at DESC LIMIT 1`
    );
    return result.rows[0]?.hash || null;
  }

  async getStats(): Promise<{ totalEvents: number; chainLength: number; oldestEvent: string | null; newestEvent: string | null }> {
    const countResult = await this.adapter.query<{ count: number }>('SELECT COUNT(*) as count FROM ideia_audit_chain');
    const chainLength = countResult.rows[0]?.count || 0;
    const auditResult = await this.auditRepo.query({ limit: 1 });
    const newestEvent = auditResult[0]?.createdAt || null;
    const oldestResult = await this.adapter.query<{ created_at: string }>(
      `SELECT created_at FROM ideia_audit_chain ORDER BY created_at ASC LIMIT 1`
    );
    return {
      totalEvents: countResult.rows[0]?.count || 0,
      chainLength,
      oldestEvent: oldestResult.rows[0]?.created_at || null,
      newestEvent,
    };
  }
}

function _cryptoRandomUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = Math.random() * 16 | 0;
    return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
  });
}
