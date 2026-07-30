import { DatabaseAdapter, DataLayerConfig, Migration, QueryResult } from '../types';
import { createLogger } from '@ideia/logger';

type DatabaseInstance = {
  exec: (sql: string) => void;
  prepare: (sql: string) => {
    run: (...params: unknown[]) => void;
    all: (...params: unknown[]) => unknown[];
    get: (...params: unknown[]) => unknown;
  };
  close: () => void;
};

export class SqliteAdapter implements DatabaseAdapter {
  private db: DatabaseInstance | null = null;
  private connected = false;

  async connect(config: DataLayerConfig): Promise<void> {
    try {
      const mod = await import('better-sqlite3');
      const Database = mod.default || mod;
      this.db = new Database(config.sqlitePath || ':memory:') as DatabaseInstance;
      this.db.exec('PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000;');
      this.connected = true;
    } catch {
      throw new Error('SQLite not available. Install better-sqlite3 or provide a custom adapter.');
    }
  }

  async disconnect(): Promise<void> {
    if (this.db) this.db.close();
    this.connected = false;
  }

  async query<T>(sql: string, params?: unknown[]): Promise<QueryResult<T>> {
    if (!this.db || !this.connected) throw new Error('Not connected');
    const start = Date.now();
    const trimmed = sql.trim();

    if (trimmed.includes(';\n') || trimmed.endsWith(';')) {
      this.db.exec(trimmed);
      return { rows: [], rowCount: 0, durationMs: Date.now() - start };
    }

    if (/^(SELECT|WITH|PRAGMA)\b/i.test(trimmed)) {
      const rows = this.db.prepare(sql).all(...(params || [])) as T[];
      return { rows, rowCount: rows.length, durationMs: Date.now() - start };
    }

    this.db.prepare(sql).run(...(params || []));
    return { rows: [], rowCount: 0, durationMs: Date.now() - start };
  }

  async migrate(migrations: Migration[]): Promise<void> {
    if (!this.db) return;
    this.db.exec(`CREATE TABLE IF NOT EXISTS ideia_migrations (version INTEGER PRIMARY KEY, name TEXT NOT NULL, applied_at TEXT DEFAULT (datetime('now')))`);

    for (const m of migrations) {
      if (!m.up || m.up.trim().startsWith('--')) continue;
      const existing = this.db.prepare('SELECT version FROM ideia_migrations WHERE version = ?').get(m.version) as { version: number } | undefined;
      if (existing) continue;
      this.db.exec(m.up);
      this.db.prepare('INSERT INTO ideia_migrations (version, name) VALUES (?, ?)').run(m.version, m.name);
    }
  }

  isConnected(): boolean { return this.connected; }
}
