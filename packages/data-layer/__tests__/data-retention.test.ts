jest.mock('@ideia/logger', () => {
  const mock = { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() };
  return { createLogger: () => mock };
});

import { DataRetentionPolicyEnforcer } from '../src/data-retention';
import { DatabaseAdapter, QueryResult } from '../src/types';
import { createLogger } from '@ideia/logger';
const logger = createLogger('data-layer');

function mockAdapter(rows: unknown[] = [] as unknown[]): jest.Mocked<DatabaseAdapter> {
  return {
    connect: jest.fn().mockResolvedValue(undefined),
    disconnect: jest.fn().mockResolvedValue(undefined),
    isConnected: jest.fn().mockReturnValue(true),
    migrate: jest.fn().mockResolvedValue(undefined),
    query: jest.fn().mockImplementation(async <T>(sql: string, _params?: unknown[]): Promise<QueryResult<T>> => {
      if (sql.includes('sqlite_master') || sql.includes('pg_catalog')) {
        return { rows: [{ name: 'ideia_sessions' }] as T[], rowCount: 1, durationMs: 0 };
      }
      return { rows: rows as T[], rowCount: rows.length, durationMs: 0 };
    }),
  };
}

describe('DataRetentionPolicyEnforcer', () => {
  let adapter: jest.Mocked<DatabaseAdapter>;

  beforeEach(() => {
    adapter = mockAdapter();
    jest.clearAllMocks();
  });

  describe('constructor', () => {
    it('should use default config when no config provided', () => {
      const enforcer = new DataRetentionPolicyEnforcer();
      expect(enforcer).toBeDefined();
    });

    it('should use defaults with no policies given', () => {
      const enforcer = new DataRetentionPolicyEnforcer({ enabled: true, defaultRetentionDays: 30, purgeIntervalMs: 3600000, policies: [] });
      expect(enforcer).toBeDefined();
    });

    it('should store adapter reference when provided', () => {
      const enforcer = new DataRetentionPolicyEnforcer({ adapter });
      expect(enforcer).toBeDefined();
    });
  });

  describe('getPolicy', () => {
    it('should return matching policy for known category', () => {
      const enforcer = new DataRetentionPolicyEnforcer();
      const policy = enforcer.getPolicy('audit_logs');
      expect(policy.category).toBe('audit_logs');
      expect(policy.retentionDays).toBe(365);
    });

    it('should return default policy for unknown category', () => {
      const enforcer = new DataRetentionPolicyEnforcer();
      const policy = enforcer.getPolicy('unknown_category');
      expect(policy.category).toBe('unknown_category');
      expect(policy.action).toBe('delete');
    });

    it('should use defaultRetentionDays when no policy matches', () => {
      const enforcer = new DataRetentionPolicyEnforcer({ defaultRetentionDays: 45 });
      const policy = enforcer.getPolicy('nonexistent');
      expect(policy.retentionDays).toBe(45);
    });
  });

  describe('addPolicy', () => {
    it('should add a new policy', () => {
      const enforcer = new DataRetentionPolicyEnforcer({ policies: [] });
      enforcer.addPolicy({ category: 'test', retentionDays: 10, action: 'delete', priority: 5 });
      const policy = enforcer.getPolicy('test');
      expect(policy.retentionDays).toBe(10);
    });

    it('should update existing policy', () => {
      const enforcer = new DataRetentionPolicyEnforcer({ policies: [{ category: 'test', retentionDays: 10, action: 'delete', priority: 5 }] });
      enforcer.addPolicy({ category: 'test', retentionDays: 20, action: 'archive', priority: 1 });
      const policy = enforcer.getPolicy('test');
      expect(policy.retentionDays).toBe(20);
      expect(policy.action).toBe('archive');
    });

    it('should sort policies by priority descending', () => {
      const enforcer = new DataRetentionPolicyEnforcer({ policies: [] });
      enforcer.addPolicy({ category: 'a', retentionDays: 1, action: 'delete', priority: 1 });
      enforcer.addPolicy({ category: 'b', retentionDays: 2, action: 'delete', priority: 5 });
      enforcer.addPolicy({ category: 'c', retentionDays: 3, action: 'delete', priority: 3 });
      const p0 = enforcer.getPolicy('b');
      expect(p0.category).toBe('b');
    });
  });

  describe('calculatePurgeDate / isExpired', () => {
    it('should calculate purge date based on retention days', () => {
      const enforcer = new DataRetentionPolicyEnforcer();
      const created = new Date('2024-01-01');
      const purgeDate = enforcer.calculatePurgeDate('sessions', created);
      expect(purgeDate.getTime()).toBeGreaterThan(created.getTime());
    });

    it('should mark as expired when past retention', () => {
      const enforcer = new DataRetentionPolicyEnforcer();
      const oldDate = new Date('2020-01-01');
      expect(enforcer.isExpired('sessions', oldDate)).toBe(true);
    });

    it('should not mark as expired when within retention', () => {
      const enforcer = new DataRetentionPolicyEnforcer();
      const recentDate = new Date();
      recentDate.setFullYear(recentDate.getFullYear() + 1);
      expect(enforcer.isExpired('sessions', recentDate)).toBe(false);
    });
  });

  describe('runPurgeCycle', () => {
    it('should return empty array when disabled', async () => {
      const enforcer = new DataRetentionPolicyEnforcer({ enabled: false });
      const reports = await enforcer.runPurgeCycle();
      expect(reports).toEqual([]);
    });

    it('should execute purge for each policy', async () => {
      const purgeAdapter = mockAdapter();
      purgeAdapter.query.mockImplementation(async <T>(sql: string, _params?: unknown[]): Promise<QueryResult<T>> => {
        if (sql.includes('sqlite_master') || sql.includes('pg_catalog')) {
          return { rows: [{ name: 'ideia_sessions' }] as T[], rowCount: 1, durationMs: 0 };
        }
        if (sql.trim().startsWith('DELETE')) {
          return { rows: [] as T[], rowCount: 5, durationMs: 0 };
        }
        return { rows: [] as T[], rowCount: 0, durationMs: 0 };
      });
      const enforcer = new DataRetentionPolicyEnforcer({
        enabled: true,
        defaultRetentionDays: 90,
        purgeIntervalMs: 86400000,
        policies: [{ category: 'sessions', retentionDays: 1, action: 'delete', priority: 1 }],
        adapter: purgeAdapter,
      });
      const reports = await enforcer.runPurgeCycle();
      expect(reports).toHaveLength(1);
      expect(reports[0].success).toBe(true);
      expect(reports[0].recordsPurged).toBe(5);
    });

    it('dryRun=true returns count without deleting', async () => {
      const purgeAdapter = mockAdapter();
      let deleteCalled = false;
      purgeAdapter.query.mockImplementation(async <T>(sql: string): Promise<QueryResult<T>> => {
        if (sql.includes('sqlite_master') || sql.includes('pg_catalog')) {
          return { rows: [{ name: 'ideia_sessions' }] as T[], rowCount: 1, durationMs: 0 };
        }
        if (sql.includes('COUNT(*)')) {
          return { rows: [{ c: 3 }] as T[], rowCount: 1, durationMs: 0 };
        }
        if (sql.trim().startsWith('DELETE')) {
          deleteCalled = true;
        }
        return { rows: [] as T[], rowCount: 0, durationMs: 0 };
      });
      const enforcer = new DataRetentionPolicyEnforcer({
        enabled: true, defaultRetentionDays: 90, purgeIntervalMs: 86400000,
        policies: [{ category: 'sessions', retentionDays: 1, action: 'delete', priority: 1 }],
        adapter: purgeAdapter,
      });
      const reports = await enforcer.runPurgeCycle(true);
      expect(reports).toHaveLength(1);
      expect(reports[0].recordsPurged).toBe(3);
      expect(reports[0].success).toBe(true);
      expect(deleteCalled).toBe(false);
    });

    it('dryRun=false actually deletes records', async () => {
      const purgeAdapter = mockAdapter();
      purgeAdapter.query.mockImplementation(async <T>(sql: string): Promise<QueryResult<T>> => {
        if (sql.includes('sqlite_master') || sql.includes('pg_catalog')) {
          return { rows: [{ name: 'ideia_sessions' }] as T[], rowCount: 1, durationMs: 0 };
        }
        if (sql.trim().startsWith('DELETE')) {
          return { rows: [] as T[], rowCount: 5, durationMs: 0 };
        }
        return { rows: [] as T[], rowCount: 0, durationMs: 0 };
      });
      const enforcer = new DataRetentionPolicyEnforcer({
        enabled: true, defaultRetentionDays: 90, purgeIntervalMs: 86400000,
        policies: [{ category: 'sessions', retentionDays: 1, action: 'delete', priority: 1 }],
        adapter: purgeAdapter,
      });
      const reports = await enforcer.runPurgeCycle(false);
      expect(reports).toHaveLength(1);
      expect(reports[0].recordsPurged).toBe(5);
    });

    it('should record failed cycles when purge query fails', async () => {
      let _queryNum = 0;
      const failAdapter = mockAdapter();
      failAdapter.query.mockImplementation(async <T>(sql: string, _params?: unknown[]): Promise<QueryResult<T>> => {
        _queryNum++;
        if (sql.includes('sqlite_master') || sql.includes('pg_catalog') || sql.includes('SELECT 1 FROM')) {
          return { rows: [{ name: 'ideia_sessions' }] as T[], rowCount: 1, durationMs: 0 };
        }
        throw new Error('DB error');
      });
      const enforcer = new DataRetentionPolicyEnforcer({
        enabled: true, defaultRetentionDays: 90, purgeIntervalMs: 86400000,
        policies: [{ category: 'sessions', retentionDays: 1, action: 'delete', priority: 1 }],
        adapter: failAdapter,
      });
      const reports = await enforcer.runPurgeCycle();
      expect(reports[0].recordsPurged).toBe(0);
      expect(reports[0].success).toBe(false);
    });

    it('should log purge actions via logger', async () => {
      const purgeAdapter = mockAdapter();
      purgeAdapter.query.mockImplementation(async <T>(sql: string): Promise<QueryResult<T>> => {
        if (sql.includes('sqlite_master') || sql.includes('pg_catalog')) {
          return { rows: [{ name: 'ideia_sessions' }] as T[], rowCount: 1, durationMs: 0 };
        }
        if (sql.trim().startsWith('DELETE')) {
          return { rows: [] as T[], rowCount: 3, durationMs: 0 };
        }
        return { rows: [] as T[], rowCount: 0, durationMs: 0 };
      });
      const enforcer = new DataRetentionPolicyEnforcer({
        enabled: true, defaultRetentionDays: 90, purgeIntervalMs: 86400000,
        policies: [{ category: 'sessions', retentionDays: 1, action: 'delete', priority: 1 }],
        adapter: purgeAdapter,
      });
      await enforcer.runPurgeCycle();
      expect(logger.info).toHaveBeenCalledWith(
        expect.stringMatching(/Purged.*sessions.*delete/)
      );
    });
  });

  describe('start / stop', () => {
    it('should start periodic purge', () => {
      const enforcer = new DataRetentionPolicyEnforcer({ adapter });
      enforcer.start();
      expect(enforcer).toBeDefined();
    });

    it('should not start duplicate interval', () => {
      const enforcer = new DataRetentionPolicyEnforcer({ adapter });
      enforcer.start();
      enforcer.start();
      expect(enforcer).toBeDefined();
    });

    it('should stop periodic purge', () => {
      const enforcer = new DataRetentionPolicyEnforcer({ adapter });
      enforcer.start();
      enforcer.stop();
      expect(enforcer).toBeDefined();
    });
  });

  describe('setAdapter', () => {
    it('should set adapter after construction', () => {
      const enforcer = new DataRetentionPolicyEnforcer();
      enforcer.setAdapter(adapter);
      expect(enforcer).toBeDefined();
    });
  });

  describe('getPurgeHistory', () => {
    it('should return empty history initially', () => {
      const enforcer = new DataRetentionPolicyEnforcer();
      expect(enforcer.getPurgeHistory()).toEqual([]);
    });

    it('should record history after purge cycles', async () => {
      adapter.query.mockResolvedValue({ rows: [], rowCount: 3, durationMs: 0 });
      const enforcer = new DataRetentionPolicyEnforcer({
        enabled: true, defaultRetentionDays: 90, purgeIntervalMs: 86400000,
        policies: [{ category: 'sessions', retentionDays: 1, action: 'delete', priority: 1 }],
        adapter,
      });
      await enforcer.runPurgeCycle();
      const history = enforcer.getPurgeHistory();
      expect(history).toHaveLength(1);
      expect(history[0].policy).toBe('sessions');
    });

    it('should handle unknown category gracefully during purge', async () => {
      const enforcer = new DataRetentionPolicyEnforcer({
        enabled: true, defaultRetentionDays: 90, purgeIntervalMs: 86400000,
        policies: [{ category: 'nonexistent_category', retentionDays: 1, action: 'delete', priority: 1 }],
        adapter,
      });
      const reports = await enforcer.runPurgeCycle();
      expect(reports).toHaveLength(1);
      expect(reports[0].recordsPurged).toBe(0);
    });
  });
});
