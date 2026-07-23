import { MemoryAdapter } from '../src/adapters/memory-adapter';

describe('MemoryAdapter', () => {
  let adapter: MemoryAdapter;

  beforeEach(() => {
    adapter = new MemoryAdapter();
  });

  describe('connect/disconnect', () => {
    it('should connect successfully', async () => {
      await adapter.connect({ type: 'sqlite', sqlitePath: ':memory:' });
      expect(adapter.isConnected()).toBe(true);
    });

    it('should disconnect successfully', async () => {
      await adapter.connect({ type: 'sqlite', sqlitePath: ':memory:' });
      await adapter.disconnect();
      expect(adapter.isConnected()).toBe(false);
    });

    it('should disconnect even if not connected', async () => {
      await expect(adapter.disconnect()).resolves.not.toThrow();
    });
  });

  describe('CREATE TABLE', () => {
    it('should create table', async () => {
      await adapter.connect({ type: 'sqlite', sqlitePath: ':memory:' });
      const result = await adapter.query('CREATE TABLE users (id INTEGER PRIMARY KEY, name TEXT)');
      expect(result.rowCount).toBe(0);
    });
  });

  describe('INSERT and SELECT', () => {
    beforeEach(async () => {
      await adapter.connect({ type: 'sqlite', sqlitePath: ':memory:' });
      await adapter.query('CREATE TABLE users (id INTEGER PRIMARY KEY, name TEXT, email TEXT)');
    });

    it('should insert and select rows', async () => {
      await adapter.query('INSERT INTO users (id, name, email) VALUES (?, ?, ?)', [1, 'Alice', 'alice@test.com']);
      await adapter.query('INSERT INTO users (id, name, email) VALUES (?, ?, ?)', [2, 'Bob', 'bob@test.com']);
      const result = await adapter.query('SELECT * FROM users');
      expect(result.rows.length).toBe(2);
      expect(result.rowCount).toBe(2);
    });

    it('should query with WHERE clause', async () => {
      await adapter.query('INSERT INTO users (id, name, email) VALUES (?, ?, ?)', [1, 'Alice', 'alice@test.com']);
      const result = await adapter.query('SELECT * FROM users WHERE name = ?', ['Alice']);
      expect(result.rows.length).toBe(1);
    });

    it('should support INSERT with ON CONFLICT', async () => {
      await adapter.query('INSERT INTO users (id, name, email) VALUES (?, ?, ?)', [1, 'Alice', 'alice@test.com']);
      await adapter.query('INSERT INTO users (id, name, email) VALUES (?, ?, ?) ON CONFLICT (id) DO UPDATE SET name = ?', [1, 'Alice Updated', 'alice@test.com', 'Alice Updated']);
      const result = await adapter.query('SELECT * FROM users WHERE id = ?', [1]);
      expect(result.rows.length).toBe(1);
    });
  });

  describe('UPDATE', () => {
    beforeEach(async () => {
      await adapter.connect({ type: 'sqlite', sqlitePath: ':memory:' });
      await adapter.query('CREATE TABLE users (id INTEGER PRIMARY KEY, name TEXT)');
      await adapter.query('INSERT INTO users (id, name) VALUES (?, ?)', [1, 'Alice']);
    });

    it('should update rows', async () => {
      await adapter.query("UPDATE users SET name = 'Alice Updated' WHERE id = ?", [1]);
      const result = await adapter.query('SELECT * FROM users');
      const row = result.rows[0] as Record<string, unknown>;
      expect(row.id).toBe(1);
      expect(row.name).toBe('Alice Updated');
    });
  });

  describe('DELETE', () => {
    beforeEach(async () => {
      await adapter.connect({ type: 'sqlite', sqlitePath: ':memory:' });
      await adapter.query('CREATE TABLE users (id INTEGER PRIMARY KEY, name TEXT)');
      await adapter.query('INSERT INTO users (id, name) VALUES (?, ?)', [1, 'Alice']);
      await adapter.query('INSERT INTO users (id, name) VALUES (?, ?)', [2, 'Bob']);
    });

    it('should delete specific rows', async () => {
      await adapter.query('DELETE FROM users WHERE id = ?', [1]);
      const result = await adapter.query('SELECT * FROM users');
      expect(result.rows.length).toBe(1);
    });

    it('should delete all rows without WHERE', async () => {
      await adapter.query('DELETE FROM users');
      const result = await adapter.query('SELECT * FROM users');
      expect(result.rows.length).toBe(0);
    });
  });

  describe('CREATE INDEX', () => {
    it('should handle CREATE INDEX without error', async () => {
      await adapter.connect({ type: 'sqlite', sqlitePath: ':memory:' });
      await adapter.query('CREATE TABLE users (id INTEGER PRIMARY KEY, name TEXT)');
      const result = await adapter.query('CREATE INDEX idx_name ON users(name)');
      expect(result.durationMs).toBeGreaterThanOrEqual(0);
    });
  });

  describe('migrate', () => {
    it('should run migrations', async () => {
      await adapter.connect({ type: 'sqlite', sqlitePath: ':memory:' });
      await adapter.migrate([
        { version: 1, name: 'create_users', up: 'CREATE TABLE users (id INTEGER PRIMARY KEY, name TEXT)' },
        { version: 2, name: 'add_email', up: 'CREATE TABLE emails (id INTEGER PRIMARY KEY, address TEXT)' },
      ]);
      await adapter.query('INSERT INTO users (id, name) VALUES (?, ?)', [1, 'Alice']);
      const result = await adapter.query('SELECT * FROM users');
      expect(result.rows.length).toBe(1);
    });

    it('should skip already-applied migrations', async () => {
      await adapter.connect({ type: 'sqlite', sqlitePath: ':memory:' });
      await adapter.migrate([
        { version: 1, name: 'create_users', up: 'CREATE TABLE users (id INTEGER PRIMARY KEY, name TEXT)' },
      ]);
      await adapter.migrate([
        { version: 1, name: 'create_users', up: 'CREATE TABLE users (id INTEGER PRIMARY KEY, name TEXT)' },
        { version: 2, name: 'add_email', up: 'CREATE TABLE emails (id INTEGER PRIMARY KEY, address TEXT)' },
      ]);
      await adapter.query('INSERT INTO users (id, name) VALUES (?, ?)', [1, 'Alice']);
      const result = await adapter.query('SELECT * FROM users');
      expect(result.rows.length).toBe(1);
    });
  });

  describe('supportsPgVectors', () => {
    it('should return false', () => {
      expect((adapter as any).supportsPgVectors).toBe(false);
    });
  });

  describe('queries with LIMIT and ORDER BY', () => {
    beforeEach(async () => {
      await adapter.connect({ type: 'sqlite', sqlitePath: ':memory:' });
      await adapter.query('CREATE TABLE items (id INTEGER PRIMARY KEY, value TEXT)');
      for (let i = 1; i <= 10; i++) {
        await adapter.query('INSERT INTO items (id, value) VALUES (?, ?)', [i, `item-${i}`]);
      }
    });

    it('should support LIMIT', async () => {
      const result = await adapter.query('SELECT * FROM items LIMIT ?', [3]);
      expect(result.rows.length).toBe(3);
    });

    it('should support ORDER BY DESC', async () => {
      const result = await adapter.query('SELECT * FROM items ORDER BY id DESC LIMIT ?', [3]);
      expect(result.rows.length).toBe(3);
    });

    it('should throw when not connected', async () => {
      const disconnected = new MemoryAdapter();
      await expect(disconnected.query('SELECT 1')).rejects.toThrow('Not connected');
    });
  });
});
