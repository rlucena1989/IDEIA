import { MemoryAdapter } from '../src/adapters/memory-adapter';
import { AuditPgAdapter } from '../src/audit-pg-adapter';

describe('AuditPgAdapter', () => {
  let adapter: MemoryAdapter;
  let auditPg: AuditPgAdapter;

  beforeEach(async () => {
    adapter = new MemoryAdapter();
    await adapter.connect({ type: 'sqlite', sqlitePath: ':memory:' });
    auditPg = new AuditPgAdapter(adapter, 'sqlite');
  });

  describe('ensureSchema', () => {
    it('should create table without error', async () => {
      await expect(auditPg.ensureSchema()).resolves.not.toThrow();
    });
  });

  describe('recordHash and verifyChain', () => {
    beforeEach(async () => {
      await auditPg.ensureSchema();
    });

    it('should record hash and verify chain', async () => {
      await auditPg.recordHash('event-1', 'hash-1', null);
      await auditPg.recordHash('event-2', 'hash-2', 'hash-1');
      const result = await auditPg.verifyChain();
      expect(result.valid).toBe(true);
      expect(result.totalEvents).toBe(2);
    });

    it('should detect chain break', async () => {
      await auditPg.recordHash('event-1', 'hash-1', null);
      await auditPg.recordHash('event-2', 'wrong-hash', 'bad-prev-hash');
      const result = await auditPg.verifyChain();
      expect(result.valid).toBe(false);
      expect(result.breakAtIndex).not.toBeNull();
    });

    it('should return valid for empty chain', async () => {
      const result = await auditPg.verifyChain();
      expect(result.valid).toBe(true);
      expect(result.totalEvents).toBe(0);
    });
  });

  describe('getLatestHash', () => {
    beforeEach(async () => {
      await auditPg.ensureSchema();
    });

    it('should return null for empty chain', async () => {
      const hash = await auditPg.getLatestHash();
      expect(hash).toBeNull();
    });

    it('should return latest hash', async () => {
      await auditPg.recordHash('event-1', 'hash-1', null);
      await auditPg.recordHash('event-2', 'hash-2', 'hash-1');
      const hash = await auditPg.getLatestHash();
      expect(hash).toBe('hash-2');
    });
  });

  describe('getStats', () => {
    beforeEach(async () => {
      await auditPg.ensureSchema();
    });

    it('should return stats for empty chain', async () => {
      const stats = await auditPg.getStats();
      expect(stats.totalEvents).toBe(0);
      expect(stats.chainLength).toBe(0);
    });

    it('should return stats for chain with events', async () => {
      await auditPg.recordHash('event-1', 'hash-1', null);
      await auditPg.recordHash('event-2', 'hash-2', 'hash-1');
      const stats = await auditPg.getStats();
      expect(stats.totalEvents).toBe(2);
      expect(stats.chainLength).toBe(2);
    });
  });

  describe('repo', () => {
    beforeEach(async () => {
      await auditPg.ensureSchema();
    });

    it('should expose audit repository', () => {
      expect(auditPg.repo).toBeDefined();
    });
  });
});
