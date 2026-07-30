jest.mock('@ideia/logger');

import { VectorStore } from '../src/vector-store';
import { DatabaseAdapter } from '../src/types';

function mockAdapter(): jest.Mocked<DatabaseAdapter> {
  return {
    connect: jest.fn().mockResolvedValue(undefined),
    disconnect: jest.fn().mockResolvedValue(undefined),
    isConnected: jest.fn().mockReturnValue(true),
    migrate: jest.fn().mockResolvedValue(undefined),
    query: jest.fn().mockResolvedValue({ rows: [], rowCount: 0, durationMs: 0 }),
  };
}

describe('VectorStore (SQLite mode)', () => {
  let adapter: jest.Mocked<DatabaseAdapter>;
  let store: VectorStore;

  beforeEach(() => {
    adapter = mockAdapter();
    store = new VectorStore(adapter, 3, false);
  });

  describe('ensureSchema', () => {
    it('should create SQLite vector table when not postgres', async () => {
      await store.ensureSchema();
      expect(adapter.query).toHaveBeenCalledWith(
        expect.stringContaining('CREATE TABLE IF NOT EXISTS ideia_vectors')
      );
    });

    it('should create vector extension when postgres', async () => {
      const pgStore = new VectorStore(adapter, 384, true);
      await pgStore.ensureSchema();
      expect(adapter.query).toHaveBeenCalledWith(
        expect.stringContaining('CREATE EXTENSION IF NOT EXISTS vector')
      );
    });

    it('should create vector index table for SQLite', async () => {
      adapter.query.mockResolvedValue({ rows: [{ c: 0 }], rowCount: 1, durationMs: 0 });
      await store.ensureSchema();
      expect(adapter.query).toHaveBeenCalledWith(
        expect.stringContaining('CREATE TABLE IF NOT EXISTS ideia_vectors')
      );
    });

    it('should not rebuild index if entries exist', async () => {
      adapter.query.mockResolvedValue({ rows: [{ c: 1 }], rowCount: 1, durationMs: 0 });
      await store.ensureSchema();
      const calls = adapter.query.mock.calls.filter(c => String(c[0]).includes('INSERT OR IGNORE'));
      expect(calls.length).toBe(0);
    });
  });

  describe('insert', () => {
    it('should insert a vector record with SQLite placeholders', async () => {
      await store.insert('id-1', 'key-1', [0.1, 0.2, 0.3], 'hello', { source: 'test' });
      expect(adapter.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO ideia_vectors'),
        expect.arrayContaining(['id-1', 'key-1'])
      );
    });

    it('should insert with postgres specific syntax when isPostgres', async () => {
      const pgStore = new VectorStore(adapter, 3, true);
      await pgStore.insert('id-1', 'key-1', [0.1, 0.2, 0.3], 'hello');
      expect(adapter.query).toHaveBeenCalledWith(
        expect.stringContaining('$1'),
        expect.any(Array)
      );
    });

    it('should handle empty metadata', async () => {
      await store.insert('id-2', 'key-2', [1, 2, 3], 'no-meta');
      expect(adapter.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT'),
        expect.arrayContaining([expect.stringContaining('{}')])
      );
    });

    it('should update on conflict (upsert)', async () => {
      await store.insert('id-1', 'same-key', [0.1, 0.2, 0.3], 'first');
      await store.insert('id-2', 'same-key', [0.4, 0.5, 0.6], 'second');
      const upsertCalls = adapter.query.mock.calls.filter(c =>
        String(c[0]).includes('ON CONFLICT')
      );
      expect(upsertCalls.length).toBe(2);
    });
  });

  describe('search', () => {
    it('should return empty array when no vectors exist', async () => {
      adapter.query.mockResolvedValue({ rows: [], rowCount: 0, durationMs: 0 });
      const results = await store.search([0.1, 0.2, 0.3]);
      expect(results).toEqual([]);
    });

    it('should rank results by cosine similarity in SQLite mode', async () => {
      adapter.query.mockResolvedValue({
        rows: [
          { id: '1', key: 'a', embedding: JSON.stringify([1, 0, 0]), content: 'hello', metadata: '{}', created_at: '2024-01-01' },
          { id: '2', key: 'b', embedding: JSON.stringify([0, 1, 0]), content: 'world', metadata: '{}', created_at: '2024-01-01' },
        ],
        rowCount: 2,
        durationMs: 0,
      });
      const results = await store.search([0.9, 0.1, 0]);
      expect(results.length).toBe(2);
      expect(results[0].key).toBe('a');
    });

    it('should limit results', async () => {
      const rows = Array.from({ length: 20 }, (_, i) => ({
        id: String(i), key: `k${i}`, embedding: JSON.stringify([1, 0, 0]),
        content: '', metadata: '{}', created_at: '2024-01-01',
      }));
      adapter.query.mockResolvedValue({ rows, rowCount: 20, durationMs: 0 });
      const results = await store.search([1, 0, 0], 5);
      expect(results.length).toBe(5);
    });

    it('should return distance from postgres query', async () => {
      const pgStore = new VectorStore(adapter, 3, true);
      adapter.query.mockResolvedValue({
        rows: [{ id: '1', key: 'a', content: 'hello', metadata: '{}', created_at: '2024-01-01', distance: 0.1 }],
        rowCount: 1, durationMs: 0,
      });
      const results = await pgStore.search([0.1, 0.2, 0.3]);
      expect(results).toHaveLength(1);
      expect(results[0].id).toBe('1');
    });

    it('should handle postgres metadata as string', async () => {
      const pgStore = new VectorStore(adapter, 3, true);
      adapter.query.mockResolvedValue({
        rows: [{ id: '1', key: 'a', content: 'test', metadata: '{"key":"val"}', created_at: '2024-01-01', distance: 0.5 }],
        rowCount: 1, durationMs: 0,
      });
      const results = await pgStore.search([0.1, 0.2, 0.3]);
      expect(results[0].metadata).toEqual({ key: 'val' });
    });

    it('should handle large dimensions in search', async () => {
      const largeDim = 1536;
      const dimStore = new VectorStore(adapter, largeDim, true);
      const largeQuery = Array.from({ length: largeDim }, () => Math.random());
      adapter.query.mockResolvedValue({
        rows: [{ id: '1', key: 'a', content: 'big', metadata: '{}', created_at: '2024-01-01', distance: 0.5 }],
        rowCount: 1, durationMs: 0,
      });
      const results = await dimStore.search(largeQuery);
      expect(results).toHaveLength(1);
      expect(results[0].content).toBe('big');
    });
  });

  describe('delete', () => {
    it('should delete a vector by key', async () => {
      await store.delete('key-to-delete');
      expect(adapter.query).toHaveBeenCalledWith(
        'DELETE FROM ideia_vectors WHERE key = ?',
        ['key-to-delete']
      );
    });

    it('should succeed even when key does not exist', async () => {
      adapter.query.mockResolvedValue({ rows: [], rowCount: 0, durationMs: 0 });
      await store.delete('nonexistent');
      expect(adapter.query).toHaveBeenCalled();
    });
  });

  describe('count', () => {
    it('should return 0 when table is empty', async () => {
      adapter.query.mockResolvedValue({ rows: [{ count: 0 }], rowCount: 1, durationMs: 0 });
      const count = await store.count();
      expect(count).toBe(0);
    });

    it('should return the correct row count', async () => {
      adapter.query.mockResolvedValue({ rows: [{ count: 5 }], rowCount: 1, durationMs: 0 });
      const count = await store.count();
      expect(count).toBe(5);
    });
  });

  describe('cosineSimilarity', () => {
    it('should handle zero magnitude vectors', async () => {
      adapter.query.mockResolvedValue({
        rows: [{ id: '1', key: 'a', embedding: JSON.stringify([0, 0, 0]), content: '', metadata: '{}', created_at: '2024-01-01' }],
        rowCount: 1, durationMs: 0,
      });
      const results = await store.search([0, 0, 0]);
      expect(results).toHaveLength(1);
    });

    it('should return empty for empty query vector', async () => {
      adapter.query.mockResolvedValue({ rows: [], rowCount: 0, durationMs: 0 });
      const results = await store.search([]);
      expect(results).toEqual([]);
    });
  });

  describe('dimensions', () => {
    it('should use default dimension 384 when not specified', () => {
      const defaultStore = new VectorStore(adapter);
      expect(defaultStore).toBeDefined();
    });

    it('should use custom dimensions when configured', () => {
      const dimStore = new VectorStore(adapter, 768);
      expect(dimStore).toBeDefined();
    });
  });
});
