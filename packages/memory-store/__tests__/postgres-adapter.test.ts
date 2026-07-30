import { PostgresMemoryStore } from '../src/postgres-adapter';
import type { MemoryRecord } from '@ideia/contracts';
import type { DatabaseAdapter, MemoryRow } from '@ideia/data-layer';

function resolveParams(sql: string, params?: unknown[]): unknown[] {
  if (!params) return [];
  const resolved: unknown[] = [];
  const placeholders = sql.match(/\$(\d+)/g) || [];
  for (const ph of placeholders) {
    const idx = parseInt(ph.slice(1), 10) - 1;
    resolved.push(idx < params.length ? params[idx] : undefined);
  }
  return resolved;
}

class InMemoryDb implements DatabaseAdapter {
  rows: MemoryRow[] = [];

  async connect() {}
  async disconnect() {}
  async query<T>(_sql: string, params?: unknown[]): Promise<{ rows: T[]; rowCount: number; durationMs: number }> {
    const sqlUpper = _sql.toUpperCase();

    if (sqlUpper.includes('CREATE TABLE')) {
      this.rows = [];
      return { rows: [], rowCount: 0, durationMs: 0 };
    }

    if (sqlUpper.includes('INSERT INTO')) {
      const row: MemoryRow = {
        id: params?.[0] as string ?? '',
        memory_id: params?.[1] as string ?? '',
        category: params?.[2] as string ?? '',
        source: params?.[3] as string ?? '',
        summary: params?.[4] as string ?? '',
        tags: params?.[5] as string ?? '[]',
        severity: params?.[6] as string ?? 'low',
        context: params?.[7] as string ?? '{}',
        created_at: params?.[8] as string ?? new Date().toISOString(),
      };
      this.rows.push(row);
      return { rows: [row] as unknown as T[], rowCount: 1, durationMs: 0 };
    }

    if (sqlUpper.includes('SELECT') && !sqlUpper.includes('COUNT')) {
      const resolved = resolveParams(_sql, params);
      let filtered = [...this.rows];

      const whereMatch = _sql.match(/WHERE\s+(.+?)(?:\s+ORDER\s|\s+LIMIT|\s*$)/i);
      if (whereMatch) {
        const clauses = whereMatch[1]!.split(/\s+AND\s+/i);
        let paramIdx = 0;
        for (const clause of clauses) {
          if (/category\s*=\s*(?:\$?\d+|\?)/i.test(clause)) {
            const val = resolved[paramIdx++] as string;
            filtered = filtered.filter(r => r.category === val);
          } else if (/severity\s*=\s*(?:\$?\d+|\?)/i.test(clause)) {
            const val = resolved[paramIdx++] as string;
            filtered = filtered.filter(r => r.severity === val);
          } else if (/source\s*=\s*(?:\$?\d+|\?)/i.test(clause)) {
            const val = resolved[paramIdx++] as string;
            filtered = filtered.filter(r => r.source === val);
          } else if (/created_at\s*>=\s*(?:\$?\d+|\?)/i.test(clause)) {
            paramIdx++;
          } else if (/created_at\s*<=\s*(?:\$?\d+|\?)/i.test(clause)) {
            paramIdx++;
          } else {
            paramIdx++;
          }
        }
      }

      if (sqlUpper.includes('LIKE')) {
        const resolved = resolveParams(_sql, params);
        let likeVal = '';
        for (let i = resolved.length - 1; i >= 0; i--) {
          if (typeof resolved[i] === 'string' && (resolved[i] as string).includes('%')) {
            likeVal = resolved[i] as string;
            break;
          }
        }
        const pattern = likeVal.replace(/%/g, '');
        if (pattern) {
          filtered = filtered.filter(r =>
            r.summary.includes(pattern) ||
            r.tags.includes(pattern) ||
            r.source.includes(pattern)
          );
        }
      }

      let limit = 50;
      const limitMatch = _sql.match(/LIMIT\s+\$?(\d+)/i);
      if (limitMatch) {
        const val = limitMatch[1]!;
        const paramIndex = parseInt(val, 10) - 1;
        if (paramIndex >= 0 && params && paramIndex < params.length) {
          limit = Number(params[paramIndex]) || 50;
        }
      }

      return { rows: filtered.slice(0, limit) as unknown as T[], rowCount: filtered.length, durationMs: 0 };
    }

    if (sqlUpper.includes('SELECT COUNT')) {
      return { rows: [{ count: this.rows.length }] as unknown as T[], rowCount: 1, durationMs: 0 };
    }

    if (sqlUpper.includes('DELETE')) {
      if (params && params.length > 0) {
        const memoryId = params[0] as string;
        const idx = this.rows.findIndex(r => r.memory_id === memoryId);
        if (idx >= 0) {
          this.rows.splice(idx, 1);
          return { rows: [], rowCount: 1, durationMs: 0 };
        }
        return { rows: [], rowCount: 0, durationMs: 0 };
      }
      const count = this.rows.length;
      this.rows = [];
      return { rows: [], rowCount: count, durationMs: 0 };
    }

    return { rows: [], rowCount: 0, durationMs: 0 };
  }
  async migrate() {}
  isConnected(): boolean { return true; }
}

function makeRecord(overrides: Partial<MemoryRecord> = {}): MemoryRecord {
  return {
    memoryId: overrides.memoryId ?? 'mem-001',
    category: overrides.category ?? 'decision' as MemoryRecord['category'],
    source: overrides.source ?? 'test',
    summary: overrides.summary ?? 'Test memory record',
    tags: overrides.tags ?? ['test'],
    severity: overrides.severity ?? 'low',
    createdAt: new Date().toISOString(),
    ...(overrides.context !== undefined ? { context: overrides.context } : {}),
  };
}

describe('PostgresMemoryStore', () => {
  let db: InMemoryDb;
  let store: PostgresMemoryStore;

  beforeEach(() => {
    db = new InMemoryDb();
    store = new PostgresMemoryStore(db, 'postgres');
  });

  describe('init', () => {
    it('should create schema tables', async () => {
      await expect(store.init()).resolves.toBeUndefined();
    });
  });

  describe('append', () => {
    it('should insert a memory record', async () => {
      await store.init();
      const record = makeRecord({ memoryId: 'mem-001', summary: 'hello' });
      await store.append(record);

      const records = await store.list();
      expect(records).toHaveLength(1);
      expect(records[0]!.memoryId).toBe('mem-001');
      expect(records[0]!.summary).toBe('hello');
    });
  });

  describe('list', () => {
    it('should return all records', async () => {
      await store.init();
      await store.append(makeRecord({ memoryId: 'a', summary: 'first' }));
      await store.append(makeRecord({ memoryId: 'b', summary: 'second' }));

      const records = await store.list();
      expect(records).toHaveLength(2);
    });

    it('should return empty array when no records exist', async () => {
      await store.init();
      const records = await store.list();
      expect(records).toEqual([]);
    });
  });

  describe('findByCategory', () => {
    it('should filter by category', async () => {
      await store.init();
      await store.append(makeRecord({ memoryId: '1', category: 'decision' }));
      await store.append(makeRecord({ memoryId: '2', category: 'cycle' }));
      await store.append(makeRecord({ memoryId: '3', category: 'decision' }));

      const decisions = await store.findByCategory('decision');
      expect(decisions).toHaveLength(2);
      expect(decisions.every(r => r.category === 'decision')).toBe(true);

      const cycles = await store.findByCategory('cycle');
      expect(cycles).toHaveLength(1);
    });
  });

  describe('findBySeverity', () => {
    it('should filter by severity', async () => {
      await store.init();
      await store.append(makeRecord({ memoryId: '1', severity: 'low' }));
      await store.append(makeRecord({ memoryId: '2', severity: 'high' }));
      await store.append(makeRecord({ memoryId: '3', severity: 'low' }));

      const low = await store.findBySeverity('low');
      expect(low).toHaveLength(2);

      const high = await store.findBySeverity('high');
      expect(high).toHaveLength(1);
    });
  });

  describe('search', () => {
    it('should find records matching the query', async () => {
      await store.init();
      await store.append(makeRecord({ memoryId: '1', summary: 'authentication failed', tags: ['auth'] }));
      await store.append(makeRecord({ memoryId: '2', summary: 'database timeout', tags: ['db'] }));
      await store.append(makeRecord({ memoryId: '3', summary: 'auth token expired', tags: ['auth'] }));

      const results = await store.search('auth');
      expect(results.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('hybridSearch', () => {
    it('should return results with scores', async () => {
      await store.init();
      await store.append(makeRecord({ memoryId: '1', summary: 'login error', category: 'failure' }));
      await store.append(makeRecord({ memoryId: '2', summary: 'system ok', category: 'cycle' }));

      const { results, scores } = await store.hybridSearch({ query: 'error', topK: 5 });
      expect(results.length).toBeGreaterThanOrEqual(1);
      expect(scores).toHaveLength(results.length);
      scores.forEach(s => expect(typeof s).toBe('number'));
    });

    it('should filter by category when provided', async () => {
      await store.init();
      await store.append(makeRecord({ memoryId: '1', summary: 'critical failure', category: 'failure', severity: 'high' }));
      await store.append(makeRecord({ memoryId: '2', summary: 'routine cycle', category: 'cycle' }));

      const { results } = await store.hybridSearch({ query: 'critical', category: 'failure', topK: 5 });
      expect(results.every(r => r.category === 'failure')).toBe(true);
    });
  });

  describe('count', () => {
    it('should return the total record count', async () => {
      await store.init();
      expect(await store.count()).toBe(0);

      await store.append(makeRecord({ memoryId: '1' }));
      await store.append(makeRecord({ memoryId: '2' }));
      expect(await store.count()).toBe(2);
    });
  });

  describe('clear', () => {
    it('should remove all records', async () => {
      await store.init();
      await store.append(makeRecord({ memoryId: '1' }));
      await store.append(makeRecord({ memoryId: '2' }));
      expect(await store.count()).toBe(2);

      await store.clear();
      expect(await store.count()).toBe(0);
      const records = await store.list();
      expect(records).toHaveLength(0);
    });
  });

  describe('load / save', () => {
    it('should return current in-memory state', () => {
      const state = store.load();
      expect(state.sessionId).toBeTruthy();
      expect(state.records).toEqual([]);
    });

    it('should update state via save', () => {
      const state = store.load();
      state.workspaceRoot = '/projects/test';
      store.save(state);

      const loaded = store.load();
      expect(loaded.workspaceRoot).toBe('/projects/test');
    });
  });

  describe('pushDecision', () => {
    it('should add a decision to the state', () => {
      const state = store.load();
      store.pushDecision(state, { action: 'approved', id: 'dec-1' });
      expect(state.lastDecisions).toHaveLength(1);
      expect(state.lastDecisions[0]).toEqual({ action: 'approved', id: 'dec-1' });
    });
  });

  describe('updateContext', () => {
    it('should merge context into state', () => {
      const state = store.load();
      store.updateContext(state, { step: 1 });
      store.updateContext(state, { phase: 'testing' });
      expect(state.context).toEqual({ step: 1, phase: 'testing' });
    });
  });

  describe('destroy', () => {
    it('should resolve without error', async () => {
      await expect(store.destroy()).resolves.toBeUndefined();
    });
  });

  describe('MemoryRow conversion', () => {
    it('should correctly parse JSON tags from row', async () => {
      await store.init();
      const record = makeRecord({ memoryId: 'mem-json', summary: 'json test', tags: ['tag-a', 'tag-b'] });
      await store.append(record);

      const records = await store.list();
      expect(records[0]!.tags).toEqual(['tag-a', 'tag-b']);
    });

    it('should handle context field when present', async () => {
      await store.init();
      const record = makeRecord({ memoryId: 'mem-ctx', summary: 'context test', context: { userId: 42, role: 'admin' } });
      await store.append(record);

      const records = await store.list();
      expect(records[0]!.context).toEqual({ userId: 42, role: 'admin' });
    });

    it('should handle records without context', async () => {
      await store.init();
      const record = makeRecord({ memoryId: 'no-ctx', summary: 'no context' });
      await store.append(record);

      const records = await store.list();
      expect(records[0]!.context).toBeUndefined();
    });
  });

  describe('error handling', () => {
    it('should propagate query errors', async () => {
      const brokenDb: DatabaseAdapter = {
        connect: async () => {},
        disconnect: async () => {},
        query: async <_T>() => { throw new Error('connection lost'); },
        migrate: async () => {},
        isConnected: () => false,
      };

      const brokenStore = new PostgresMemoryStore(brokenDb, 'postgres');
      await expect(brokenStore.list()).rejects.toThrow('connection lost');
    });

    it('should propagate insert errors', async () => {
      const brokenDb: DatabaseAdapter = {
        connect: async () => {},
        disconnect: async () => {},
        query: async <_T>() => { throw new Error('unique constraint violation'); },
        migrate: async () => {},
        isConnected: () => false,
      };

      const brokenStore = new PostgresMemoryStore(brokenDb, 'postgres');
      await expect(brokenStore.append(makeRecord())).rejects.toThrow('unique constraint violation');
    });
  });
});
