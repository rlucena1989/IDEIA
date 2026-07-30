import { DatabaseAdapter, DataLayerConfig, Migration, QueryResult } from '../types';
import { createLogger } from '@ideia/logger';

type PoolType = { connect(): Promise<{ query: (text: string, params?: unknown[]) => Promise<{ rows: unknown[]; rowCount: number }>; release: () => void }>; end: () => Promise<void> };

export class PgAdapter implements DatabaseAdapter {
  private pool: PoolType | null = null;
  private connected = false;

  async connect(config: DataLayerConfig): Promise<void> {
    try {
      const { Pool } = await import('pg');
      this.pool = new Pool({
        host: config.host || 'localhost',
        port: config.port || 5432,
        database: config.database || 'ideia',
        user: config.user || 'ideia',
        password: config.password || 'ideia',
        max: config.maxConnections || 10,
      }) as PoolType;
      const client = await this.pool.connect();
      client.release();
      this.connected = true;
    } catch {
      throw new Error('PostgreSQL not available. Install pg package or use sqlite adapter.');
    }
  }

  async disconnect(): Promise<void> {
    if (this.pool) await this.pool.end();
    this.connected = false;
  }

  async query<T>(sql: string, params?: unknown[]): Promise<QueryResult<T>> {
    if (!this.pool || !this.connected) throw new Error('Not connected');
    const start = Date.now();
    const client = await this.pool.connect();
    try {
      const result = await client.query(sql, params);
      return { rows: result.rows as T[], rowCount: result.rowCount, durationMs: Date.now() - start };
    } finally {
      client.release();
    }
  }

  async migrate(migrations: Migration[]): Promise<void> {
    await this.query(`CREATE TABLE IF NOT EXISTS ideia_migrations (version INT PRIMARY KEY, name TEXT NOT NULL, applied_at TIMESTAMPTZ DEFAULT NOW())`);

    for (const m of migrations) {
      const existing = await this.query<{ version: number }>('SELECT version FROM ideia_migrations WHERE version = $1', [m.version]);
      if (existing.rows.length > 0) continue;
      await this.query(m.up);
      await this.query('INSERT INTO ideia_migrations (version, name) VALUES ($1, $2)', [m.version, m.name]);
    }
  }

  isConnected(): boolean { return this.connected; }
}
