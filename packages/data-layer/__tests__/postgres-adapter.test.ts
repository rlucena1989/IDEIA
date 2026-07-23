import { PgAdapter } from '../src/adapters/pg-adapter';
import { DataLayerConfig } from '../src/types';

const PG_AVAILABLE = process.env.CI === 'true' || !!process.env.POSTGRES_URL;

(PG_AVAILABLE ? describe : describe.skip)('PgAdapter', () => {
  let adapter: PgAdapter;
  const config: DataLayerConfig = {
    type: 'postgres',
    host: process.env.POSTGRES_HOST || 'localhost',
    port: parseInt(process.env.POSTGRES_PORT || '5432', 10),
    database: process.env.POSTGRES_DB || 'ideia_test',
    user: process.env.POSTGRES_USER || 'ideia',
    password: process.env.POSTGRES_PASSWORD || 'ideia',
  };

  beforeAll(async () => {
    adapter = new PgAdapter();
    await adapter.connect(config);
  });

  afterAll(async () => {
    await adapter.disconnect();
  });

  it('should connect and report connected', () => {
    expect(adapter.isConnected()).toBe(true);
  });

  it('should execute CREATE TABLE and SELECT', async () => {
    await adapter.query('CREATE TABLE IF NOT EXISTS test_table (id INT PRIMARY KEY, name TEXT)');
    const result = await adapter.query<{ id: number; name: string }>('SELECT * FROM test_table');
    expect(result.rows).toEqual([]);
    expect(result.rowCount).toBe(0);
    await adapter.query('DROP TABLE IF EXISTS test_table');
  });

  it('should run migrations', async () => {
    const migrations = [
      { version: 1, name: 'create_test', up: 'CREATE TABLE IF NOT EXISTS migrate_test (id INT PRIMARY KEY, val TEXT)' },
    ];
    await adapter.migrate(migrations);
    const result = await adapter.query<{ version: number }>('SELECT version FROM ideia_migrations WHERE version = 1');
    expect(result.rows.length).toBe(1);
    expect(result.rows[0].version).toBe(1);
    await adapter.query('DROP TABLE IF EXISTS migrate_test');
  });

  it('should skip already-applied migrations', async () => {
    const result = await adapter.query<{ version: number }>('SELECT version FROM ideia_migrations WHERE version = 1');
    await adapter.migrate([{ version: 1, name: 'create_test', up: 'CREATE TABLE IF NOT EXISTS duplicate_test (id INT)' }]);
    expect(result.rows.length).toBe(1);
  });

  it('should handle params binding', async () => {
    await adapter.query('CREATE TABLE IF NOT EXISTS param_test (id INT PRIMARY KEY, label TEXT)');
    await adapter.query('INSERT INTO param_test (id, label) VALUES ($1, $2)', [1, 'hello']);
    const result = await adapter.query<{ id: number; label: string }>('SELECT * FROM param_test WHERE id = $1', [1]);
    expect(result.rows.length).toBe(1);
    expect(result.rows[0].label).toBe('hello');
    await adapter.query('DROP TABLE IF EXISTS param_test');
  });

  it('should handle disconnection', async () => {
    const a2 = new PgAdapter();
    await a2.connect(config);
    expect(a2.isConnected()).toBe(true);
    await a2.disconnect();
    expect(a2.isConnected()).toBe(false);
  });
});

(PG_AVAILABLE ? describe : describe.skip)('DataLayer with PostgreSQL', () => {
  let adapter: PgAdapter;
  const config: DataLayerConfig = {
    type: 'postgres',
    host: process.env.POSTGRES_HOST || 'localhost',
    port: parseInt(process.env.POSTGRES_PORT || '5432', 10),
    database: process.env.POSTGRES_DB || 'ideia_test',
    user: process.env.POSTGRES_USER || 'ideia',
    password: process.env.POSTGRES_PASSWORD || 'ideia',
  };

  beforeAll(async () => {
    adapter = new PgAdapter();
    await adapter.connect(config);
  });

  afterAll(async () => {
    await adapter.query('DROP TABLE IF EXISTS ideia_decisions CASCADE');
    await adapter.query('DROP TABLE IF EXISTS ideia_sessions CASCADE');
    await adapter.query('DROP TABLE IF EXISTS ideia_audit_log CASCADE');
    await adapter.query('DROP TABLE IF EXISTS ideia_vectors CASCADE');
    await adapter.query('DROP TABLE IF EXISTS ideia_migrations CASCADE');
    await adapter.disconnect();
  });

  it('should run all DataLayer migrations on PostgreSQL', async () => {
    const migrations = [
      { version: 1, name: 'initial', up: `
        CREATE TABLE IF NOT EXISTS ideia_decisions (
          id UUID PRIMARY KEY, action_id TEXT NOT NULL, action_type TEXT NOT NULL,
          decision TEXT NOT NULL, reason TEXT, metadata JSONB DEFAULT '{}',
          created_at TIMESTAMPTZ DEFAULT NOW()
        );
        CREATE TABLE IF NOT EXISTS ideia_sessions (
          id UUID PRIMARY KEY, workspace_root TEXT NOT NULL, status TEXT DEFAULT 'active',
          metadata JSONB DEFAULT '{}', started_at TIMESTAMPTZ DEFAULT NOW(), ended_at TIMESTAMPTZ
        );
      `},
    ];
    await adapter.migrate(migrations);
    const result = await adapter.query<{ version: number }>('SELECT version FROM ideia_migrations');
    expect(result.rows.length).toBeGreaterThanOrEqual(1);
  });

  it('should support JSONB queries', async () => {
    await adapter.query(
      `INSERT INTO ideia_sessions (id, workspace_root, metadata)
       VALUES ($1, $2, $3::jsonb)`,
      ['00000000-0000-0000-0000-000000000001', '/test', JSON.stringify({ env: 'test', user: 'ci' })]
    );
    const result = await adapter.query<{ metadata: any }>(
      "SELECT metadata FROM ideia_sessions WHERE id = $1",
      ['00000000-0000-0000-0000-000000000001']
    );
    expect(result.rows[0].metadata).toBeTruthy();
  });
});
