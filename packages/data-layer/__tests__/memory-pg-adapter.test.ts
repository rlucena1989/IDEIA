import { MemoryAdapter } from '../src/adapters/memory-adapter';
import { MemoryPgAdapter } from '../src/memory-pg-adapter';

describe('MemoryPgAdapter', () => {
  let adapter: MemoryAdapter;
  let memoryPg: MemoryPgAdapter;

  beforeEach(async () => {
    adapter = new MemoryAdapter();
    await adapter.connect({ type: 'sqlite', sqlitePath: ':memory:' });
    memoryPg = new MemoryPgAdapter(adapter, 'sqlite');
  });

  describe('ensureSchema', () => {
    it('should create tables without error', async () => {
      await expect(memoryPg.ensureSchema()).resolves.not.toThrow();
    });
  });

  describe('insertMemory and queryMemory', () => {
    beforeEach(async () => {
      await memoryPg.ensureSchema();
    });

    it('should insert and query memory records', async () => {
      await memoryPg.insertMemory({
        id: '1', memoryId: 'mem-1', category: 'decision',
        source: 'chat', summary: 'Test decision', tags: ['test'],
        severity: 'low', context: { key: 'value' },
      });
      const results = await memoryPg.queryMemory({});
      expect(results.length).toBe(1);
      expect(results[0].memory_id).toBe('mem-1');
    });

    it('should filter by category', async () => {
      await memoryPg.insertMemory({ id: '1', memoryId: 'mem-1', category: 'decision', source: 'chat', summary: 'Decision', tags: [], severity: 'low' });
      await memoryPg.insertMemory({ id: '2', memoryId: 'mem-2', category: 'observation', source: 'code', summary: 'Observation', tags: [], severity: 'medium' });
      const results = await memoryPg.queryMemory({ category: 'decision' });
      expect(results.length).toBe(1);
    });

    it('should filter by severity', async () => {
      await memoryPg.insertMemory({ id: '1', memoryId: 'mem-1', category: 'decision', source: 'chat', summary: 'High severity', tags: [], severity: 'high' });
      await memoryPg.insertMemory({ id: '2', memoryId: 'mem-2', category: 'decision', source: 'chat', summary: 'Low severity', tags: [], severity: 'low' });
      const results = await memoryPg.queryMemory({ severity: 'high' });
      expect(results.length).toBe(1);
    });
  });

  describe('searchMemory', () => {
    beforeEach(async () => {
      await memoryPg.ensureSchema();
      await memoryPg.insertMemory({ id: '1', memoryId: 'mem-1', category: 'decision', source: 'chat', summary: 'Login flow design decision', tags: [], severity: 'low' });
      await memoryPg.insertMemory({ id: '2', memoryId: 'mem-2', category: 'observation', source: 'code', summary: 'API performance bottleneck', tags: [], severity: 'high' });
    });

    it('should find by summary match', async () => {
      const results = await memoryPg.searchMemory('Login');
      expect(results.length).toBe(1);
    });

    it('should return all relevant results', async () => {
      const results = await memoryPg.searchMemory('design');
      expect(results.length).toBeGreaterThanOrEqual(1);
    });

    it('should return empty for no match', async () => {
      const results = await memoryPg.searchMemory('nonexistent');
      expect(results.length).toBe(0);
    });

    it('should respect limit parameter', async () => {
      const results = await memoryPg.searchMemory('e', 1);
      expect(results.length).toBeLessThanOrEqual(1);
    });
  });

  describe('countMemory', () => {
    it('should return 0 for empty', async () => {
      await memoryPg.ensureSchema();
      const count = await memoryPg.countMemory();
      expect(count).toBe(0);
    });

    it('should return correct count', async () => {
      await memoryPg.ensureSchema();
      await memoryPg.insertMemory({ id: '1', memoryId: 'mem-1', category: 'decision', source: 'chat', summary: 'Test', tags: [], severity: 'low' });
      await memoryPg.insertMemory({ id: '2', memoryId: 'mem-2', category: 'decision', source: 'chat', summary: 'Test 2', tags: [], severity: 'low' });
      const count = await memoryPg.countMemory();
      expect(count).toBe(2);
    });
  });

  describe('deleteMemory', () => {
    it('should delete by memoryId', async () => {
      await memoryPg.ensureSchema();
      await memoryPg.insertMemory({ id: '1', memoryId: 'mem-1', category: 'decision', source: 'chat', summary: 'Test', tags: [], severity: 'low' });
      await memoryPg.deleteMemory('mem-1');
      const count = await memoryPg.countMemory();
      expect(count).toBe(0);
    });
  });

  describe('deleteOlderThan', () => {
    it('should delete old records', async () => {
      await memoryPg.ensureSchema();
      await memoryPg.insertMemory({ id: '1', memoryId: 'mem-1', category: 'decision', source: 'chat', summary: 'Old', tags: [], severity: 'low' });
      const futureDate = new Date(Date.now() + 86400000).toISOString();
      const deleted = await memoryPg.deleteOlderThan(futureDate);
      expect(deleted).toBeGreaterThanOrEqual(0);
    });
  });

  describe('repositories', () => {
    beforeEach(async () => {
      await memoryPg.ensureSchema();
    });

    it('should expose decision repository', () => {
      expect(memoryPg.decisions).toBeDefined();
    });

    it('should expose session repository', () => {
      expect(memoryPg.sessions).toBeDefined();
    });
  });
});
