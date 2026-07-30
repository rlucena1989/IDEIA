import { DataLayer } from '../src/data-layer';
import { MemoryAdapter } from '../src/adapters/memory-adapter';
import { VectorStore } from '../src/vector-store';
import { DataRetentionPolicyEnforcer } from '../src/data-retention';
import { analyzeQuery, suggestIndexes, generateAllIndexesSQL } from '../src/query-optimizer';
import { DRManager } from '../src/dr-plan';

function createLayer(): DataLayer {
  const adapter = new MemoryAdapter();
  return new DataLayer({ type: 'sqlite' }, adapter);
}

describe('DataLayer Integration', () => {
  describe('VectorStore CRUD', () => {
    let vs: VectorStore;
    let adapter: MemoryAdapter;

    beforeAll(async () => {
      adapter = new MemoryAdapter();
      await adapter.connect({ type: 'sqlite' });
      vs = new VectorStore(adapter, 4, false);
      await vs.ensureSchema();
    });

    it('should insert and count vectors', async () => {
      await vs.insert('v1', 'key1', [0.1, 0.2, 0.3, 0.4], 'content a', { tag: 'test' });
      await vs.insert('v2', 'key2', [0.5, 0.6, 0.7, 0.8], 'content b');
      const count = await vs.count();
      expect(count).toBe(2);
    });

    it('should search and return scored results', async () => {
      const results = await vs.search([0.1, 0.2, 0.3, 0.4], 5);
      expect(results.length).toBeGreaterThanOrEqual(1);
      expect(results[0].key).toBe('key1');
      expect(results[0].metadata).toBeDefined();
    });

    it('should delete vectors', async () => {
      await vs.delete('key1');
      const count = await vs.count();
      expect(count).toBe(1);
    });

    it('should handle upsert on conflict', async () => {
      await vs.insert('v3', 'key3', [1, 0, 0, 0], 'original', { v: 1 });
      await vs.insert('v4', 'key3', [0, 1, 0, 0], 'updated', { v: 2 });
      const results = await vs.search([1, 0, 0, 0], 5);
      expect(results.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('DataRetention dry-run mode', () => {
    it('should run purge cycle in dry-run without side effects', async () => {
      const adapter = new MemoryAdapter();
      await adapter.connect({ type: 'sqlite' });
      const enforcer = new DataRetentionPolicyEnforcer({ adapter });
      const reports = await enforcer.runPurgeCycle(true);
      expect(Array.isArray(reports)).toBe(true);
      for (const r of reports) {
        expect(r).toHaveProperty('policy');
        expect(r).toHaveProperty('recordsPurged');
        expect(r).toHaveProperty('success');
        expect(r.success).toBe(true);
      }
    });

    it('should handle empty adapter gracefully', async () => {
      const enforcer = new DataRetentionPolicyEnforcer({ adapter: undefined as never });
      const reports = await enforcer.runPurgeCycle(true);
      expect(reports.every((r) => r.recordsPurged === 0)).toBe(true);
    });

    it('should track purge history', async () => {
      const adapter = new MemoryAdapter();
      await adapter.connect({ type: 'sqlite' });
      const enforcer = new DataRetentionPolicyEnforcer({ adapter });
      await enforcer.runPurgeCycle(true);
      const history = enforcer.getPurgeHistory();
      expect(history.length).toBeGreaterThanOrEqual(6);
    });
  });

  describe('QueryOptimizer plan generation', () => {
    it('should generate a plan for vector_search type', () => {
      const plan = analyzeQuery('vector_search', 'vectors', ['embedding']);
      expect(plan.type).toBe('vector_search');
      expect(plan.table).toBe('vectors');
      expect(plan).toHaveProperty('hasIndex');
      expect(plan).toHaveProperty('suggestions');
    });

    it('should generate a plan for select without indexes', () => {
      const plan = analyzeQuery('select', 'unknown_table');
      expect(plan.hasIndex).toBe(false);
      expect(plan.suggestions.length).toBeGreaterThan(0);
      expect(plan.suggestions[0]).toContain('No indexes');
    });

    it('should suggest ivfflat index for vector search', () => {
      const plan = analyzeQuery('vector_search', 'memory_entries');
      const hasIvfflat = plan.suggestions.some((s) => s.includes('ivfflat'));
      expect(hasIvfflat).toBe(true);
    });

    it('should suggest indexes for specific table', () => {
      const indexes = suggestIndexes('decisions');
      expect(indexes.length).toBeGreaterThanOrEqual(3);
      expect(indexes.every((i) => i.table === 'decisions')).toBe(true);
    });

    it('should generate valid CREATE INDEX SQL', () => {
      const sql = generateAllIndexesSQL();
      expect(sql).toContain('CREATE');
      expect(sql).toContain('INDEX');
      expect(sql).toContain('IF NOT EXISTS');
    });

    it('should optimize a query by adding LIMIT', () => {
      const { optimizeQuery } = require('../src/query-optimizer');
      const optimized = optimizeQuery('SELECT * FROM users');
      expect(optimized).toMatch(/LIMIT 1000/);
    });
  });

  describe('DR plan execution (async)', () => {
    it('should execute a DR plan in dry-run mode', async () => {
      const drm = new DRManager();
      const result = await drm.executePlan('dr-db-corruption', { dryRun: true });
      expect(result.planId).toBe('dr-db-corruption');
      expect(result.success).toBe(true);
      expect(result.failedSteps).toEqual([]);
      expect(result.actualRtoMs).toBe(0);
      expect(result).toHaveProperty('startedAt');
      expect(result).toHaveProperty('completedAt');
    });

    it('should list available plans', () => {
      const drm = new DRManager();
      const plans = drm.listPlans();
      expect(plans.length).toBeGreaterThanOrEqual(3);
      const ids = plans.map((p) => p.id);
      expect(ids).toContain('dr-db-corruption');
      expect(ids).toContain('dr-region-failure');
      expect(ids).toContain('dr-backup-failure');
    });

    it('should filter plans by disaster level', () => {
      const drm = new DRManager();
      const catastrophic = drm.listPlans('catastrophic');
      expect(catastrophic.length).toBe(1);
      expect(catastrophic[0].id).toBe('dr-region-failure');
      const severe = drm.listPlans('severe');
      expect(severe.length).toBe(1);
      expect(severe[0].id).toBe('dr-db-corruption');
    });

    it('should report RTO/RPO snapshot compliance', () => {
      const drm = new DRManager();
      const snapshot = drm.getRtoRpoSnapshot();
      expect(snapshot.length).toBeGreaterThanOrEqual(3);
      for (const s of snapshot) {
        expect(s).toHaveProperty('compliance');
        expect(s).toHaveProperty('planName');
        expect(s).toHaveProperty('rtoMs');
        expect(s).toHaveProperty('rpoMs');
        expect(['compliant', 'at-risk', 'breached']).toContain(s.compliance);
      }
    });

    it('should throw for unknown plan', async () => {
      const drm = new DRManager();
      await expect(drm.executePlan('non-existent')).rejects.toThrow('DR plan not found');
    });
  });

  describe('DataLayer lifecycle', () => {
    it('should connect, query, and disconnect', async () => {
      const layer = createLayer();
      await layer.connect();
      expect(layer.isConnected).toBe(true);

      const result = await layer.query('SELECT 1');
      expect(result).toBeDefined();
      expect(result.rowCount).toBe(0);

      await layer.disconnect();
      expect(layer.isConnected).toBe(false);
    });

    it('should create and end sessions', async () => {
      const layer = createLayer();
      await layer.connect();
      const id = await layer.createSession('/test');
      expect(id).toBeTruthy();
      await layer.endSession(id);
      await layer.disconnect();
    });

    it('should record decisions', async () => {
      const layer = createLayer();
      await layer.connect();
      await layer.recordDecision({ actionId: 'a1', actionType: 'test', decision: 'approve' });
      await layer.disconnect();
    });
  });
});
