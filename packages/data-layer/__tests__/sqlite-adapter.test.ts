describe('SqliteAdapter', () => {
  let SqliteAdapter: typeof import('../src/adapters/sqlite-adapter').SqliteAdapter;

  beforeAll(async () => {
    try {
      const mod = await import('../src/adapters/sqlite-adapter');
      SqliteAdapter = mod.SqliteAdapter;
    } catch {
    }
  });

  it('should be a class', () => {
    expect(typeof SqliteAdapter).toBe('function');
  });

  const hasSqlite = (() => { try { require('better-sqlite3'); return true; } catch { return false; } })();

  if (hasSqlite) {
    it('should connect with sqlite available', async () => {
      if (SqliteAdapter) {
        const adapter = new SqliteAdapter();
        await expect(adapter.connect({ type: 'sqlite', sqlitePath: ':memory:' })).resolves.toBeUndefined();
      }
    });
  } else {
    it('should fail to connect when better-sqlite3 is not installed', async () => {
      if (SqliteAdapter) {
        const adapter = new SqliteAdapter();
        await expect(adapter.connect({ type: 'sqlite', sqlitePath: ':memory:' })).rejects.toThrow('SQLite not available');
      }
    });
  }
});
