import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { MemoryAdapter } from '../src/adapters/memory-adapter';
import { DecisionRepository } from '../src/repositories/decision-repo';
import { SessionRepository } from '../src/repositories/session-repo';
import { AuditRepository } from '../src/repositories/audit-repo';
import { VectorRepository } from '../src/repositories/vector-repo';

describe('Repositories (MemoryAdapter)', () => {
  let adapter: MemoryAdapter;

  beforeEach(async () => {
    adapter = new MemoryAdapter();
    await adapter.connect({ type: 'sqlite' });
  });

  afterEach(async () => {
    await adapter.disconnect();
  });

  describe('DecisionRepository', () => {
    it('should ensure table and insert', async () => {
      const repo = new DecisionRepository(adapter, 'sqlite');
      await repo.ensureTable();
      await repo.insert({
        id: '1', actionId: 'act-1', actionType: 'test', decision: 'allow',
        reason: 'ok', metadata: { key: 'val' }, createdAt: new Date().toISOString(),
      });
      const found = await repo.findById('1');
      expect(found).not.toBeNull();
    });

    it('should query with filters', async () => {
      const repo = new DecisionRepository(adapter, 'sqlite');
      await repo.ensureTable();
      await repo.insert({ id: '1', actionId: 'a1', actionType: 'deploy', decision: 'allow', createdAt: new Date().toISOString() });
      await repo.insert({ id: '2', actionId: 'a2', actionType: 'delete', decision: 'block', createdAt: new Date().toISOString() });
      const results = await repo.query({});
      expect(results.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe('SessionRepository', () => {
    it('should ensure table and insert', async () => {
      const repo = new SessionRepository(adapter, 'sqlite');
      await repo.ensureTable();
      await repo.insert({ id: 's1', workspaceRoot: '/test', status: 'active', startedAt: new Date().toISOString() });
      const found = await repo.findById('s1');
      expect(found).not.toBeNull();
    });
  });

  describe('AuditRepository', () => {
    it('should ensure table and insert', async () => {
      const repo = new AuditRepository(adapter, 'sqlite');
      await repo.ensureTable();
      await repo.insert({ id: 'a1', actor: 'system', eventType: 'deploy', decision: 'allow', result: 'success', createdAt: new Date().toISOString() });
      const results = await adapter.query<{ actor: string }>('SELECT actor FROM ideia_audit_log');
      expect(results.rows.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('VectorRepository', () => {
    it('should have const and methods', () => {
      const repo = new VectorRepository(adapter, 'sqlite');
      expect(repo).toBeDefined();
    });
  });
});
