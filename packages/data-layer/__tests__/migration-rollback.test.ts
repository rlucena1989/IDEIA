import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { SqliteAdapter } from '../src/adapters/sqlite-adapter';
import { DatabaseAdapter, Migration, DataLayerConfig } from '../src/types';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

const MIGRATIONS: Migration[] = [
  { version: 1, name: 'users', up: 'CREATE TABLE IF NOT EXISTS test_users (id TEXT PRIMARY KEY, name TEXT);', down: 'DROP TABLE IF EXISTS test_users;' },
  { version: 2, name: 'posts', up: 'CREATE TABLE IF NOT EXISTS test_posts (id TEXT PRIMARY KEY, user_id TEXT, title TEXT);', down: 'DROP TABLE IF EXISTS test_posts;' },
];

describe('Migration Rollback', () => {
  let adapter: DatabaseAdapter;
  let dbPath: string;

  beforeEach(() => {
    dbPath = path.join(os.tmpdir(), `migration-test-${Date.now()}.db`);
  });

  afterEach(() => {
    try { if (fs.existsSync(dbPath)) fs.unlinkSync(dbPath); } catch { /* silent */ }
  });

  it('can apply and verify migrations', async () => {
    adapter = new SqliteAdapter();
    await adapter.connect({ type: 'sqlite', sqlitePath: dbPath } as DataLayerConfig);
    await adapter.migrate(MIGRATIONS);

    const tables = await adapter.query(
      "SELECT name FROM sqlite_master WHERE type='table' AND name IN ('test_users', 'test_posts') ORDER BY name"
    );
    expect(tables.rows.length).toBe(2);
    await adapter.disconnect();
  });

  it('can rollback a migration', async () => {
    adapter = new SqliteAdapter();
    await adapter.connect({ type: 'sqlite', sqlitePath: dbPath } as DataLayerConfig);
    await adapter.migrate(MIGRATIONS);

    const downSql = MIGRATIONS[1]?.down ?? '';
    if (downSql) {
      for (const stmt of downSql.split(';').filter(Boolean)) {
        await adapter.query(stmt.trim());
      }
    }

    const tables = await adapter.query(
      "SELECT name FROM sqlite_master WHERE type='table' AND name = 'test_posts'"
    );
    expect(tables.rows.length).toBe(0);
    await adapter.disconnect();
  });

  it('can rollback all migrations to clean state', async () => {
    adapter = new SqliteAdapter();
    await adapter.connect({ type: 'sqlite', sqlitePath: dbPath } as DataLayerConfig);
    await adapter.migrate(MIGRATIONS);

    for (let i = MIGRATIONS.length - 1; i >= 0; i--) {
      const m = MIGRATIONS[i];
      if (m.down && m.down.trim()) {
        for (const stmt of m.down.split(';').filter(Boolean)) {
          try { await adapter.query(stmt.trim()); } catch { /* table may not exist */ }
        }
      }
    }

    const tables = await adapter.query(
      "SELECT name FROM sqlite_master WHERE type='table' AND name LIKE 'test_%'"
    );
    expect(tables.rows.length).toBe(0);
    await adapter.disconnect();
  });
});
