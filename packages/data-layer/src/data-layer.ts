import { DataLayerConfig, DatabaseAdapter, Migration, QueryResult } from './types';
import { createLogger } from '@ideia/logger';
import { VectorStore } from './vector-store';
import { PgAdapter } from './adapters/pg-adapter';
import { SqliteAdapter } from './adapters/sqlite-adapter';

const MIGRATIONS: Migration[] = [
  { version: 1, name: 'initial', up: `
    CREATE TABLE IF NOT EXISTS ideia_decisions (
      id TEXT PRIMARY KEY,
      action_id TEXT NOT NULL,
      action_type TEXT NOT NULL,
      decision TEXT NOT NULL,
      reason TEXT,
      metadata TEXT DEFAULT '{}',
      created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS ideia_sessions (
      id TEXT PRIMARY KEY,
      workspace_root TEXT NOT NULL,
      status TEXT DEFAULT 'active',
      metadata TEXT DEFAULT '{}',
      started_at TEXT NOT NULL,
      ended_at TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_decisions_action ON ideia_decisions(action_id);
    CREATE INDEX IF NOT EXISTS idx_sessions_status ON ideia_sessions(status);
  `, down: 'DROP TABLE IF EXISTS ideia_decisions; DROP TABLE IF EXISTS ideia_sessions;' },
  { version: 2, name: 'audit_log', up: `
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
    CREATE INDEX IF NOT EXISTS idx_audit_created ON ideia_audit_log(created_at);
  `, down: 'DROP TABLE IF EXISTS ideia_audit_log;' },
  { version: 3, name: 'vector_ready', up: '-- Vector tables created by VectorStore.ensureSchema()', down: '' },
];

export class DataLayer {
  private adapter: DatabaseAdapter;
  private vectorStore: VectorStore;
  private connected = false;

  constructor(config: DataLayerConfig, adapter?: DatabaseAdapter) {
    if (adapter) {
      this.adapter = adapter;
    } else {
      this.adapter = config.type === 'postgres' ? new PgAdapter() : new SqliteAdapter();
    }
    this.vectorStore = new VectorStore(this.adapter, config.vectorDimensions || 384, config.type === 'postgres');
  }

  get vector(): VectorStore { return this.vectorStore; }
  get adapter_(): DatabaseAdapter { return this.adapter; }
  get isConnected(): boolean { return this.connected; }

  async connect(config?: DataLayerConfig): Promise<void> {
    if (this.connected) return;
    const cfg = config || { type: 'sqlite' } as DataLayerConfig;
    try {
      await this.adapter.connect(cfg);
      await this.adapter.migrate(MIGRATIONS);
      await this.vectorStore.ensureSchema();
      this.connected = true;
    } catch (_err) {
      throw new Error(`DataLayer connect failed: ${_err}`);
    }
  }

  async disconnect(): Promise<void> {
    if (this.connected) {
      await this.adapter.disconnect();
      this.connected = false;
    }
  }

  async query<T>(sql: string, params?: unknown[]): Promise<QueryResult<T>> {
    if (!this.connected) throw new Error('DataLayer not connected');
    return this.adapter.query<T>(sql, params);
  }

  async recordDecision(data: { actionId: string; actionType: string; decision: string; reason?: string; metadata?: Record<string, unknown> }): Promise<void> {
    await this.query(
      'INSERT INTO ideia_decisions (id, action_id, action_type, decision, reason, metadata, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [crypto.randomUUID(), data.actionId, data.actionType, data.decision, data.reason || '', JSON.stringify(data.metadata || {}), new Date().toISOString()]
    );
  }

  async createSession(workspaceRoot: string): Promise<string> {
    const id = crypto.randomUUID();
    await this.query(
      'INSERT INTO ideia_sessions (id, workspace_root, status, started_at) VALUES (?, ?, ?, ?)',
      [id, workspaceRoot, 'active', new Date().toISOString()]
    );
    return id;
  }

  async endSession(id: string): Promise<void> {
    await this.query('UPDATE ideia_sessions SET status = ?, ended_at = ? WHERE id = ?', ['ended', new Date().toISOString(), id]);
  }
}

export function createDataLayer(config?: DataLayerConfig, adapter?: DatabaseAdapter): DataLayer {
  return new DataLayer(config || { type: 'sqlite' }, adapter);
}
