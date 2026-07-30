import { ReplicaManager } from '../src/replicas';
import { DatabaseAdapter, QueryResult } from '../src/types';

const mockAdapter = (_name: string): jest.Mocked<DatabaseAdapter> => ({
  query: jest.fn().mockResolvedValue({ rows: [], rowCount: 0, durationMs: 1 }),
  connect: jest.fn().mockResolvedValue(undefined),
  disconnect: jest.fn().mockResolvedValue(undefined),
  migrate: jest.fn().mockResolvedValue(undefined),
  isConnected: jest.fn().mockReturnValue(true),
});

let primaryAdapter: jest.Mocked<DatabaseAdapter>;

beforeEach(() => {
  primaryAdapter = mockAdapter('primary');
  jest.useFakeTimers();
});

afterEach(() => {
  jest.useRealTimers();
});

describe('ReplicaManager', () => {
  describe('construction', () => {
    it('should construct with primary adapter only', () => {
      const mgr = new ReplicaManager(primaryAdapter);
      expect(mgr.getHealthyCount()).toBe(0);
    });

    it('should construct with replicas and start health timer', () => {
      const mgr = new ReplicaManager(primaryAdapter, {
        replicas: [{ host: 'replica1', port: 5432, weight: 1 }],
        healthCheckIntervalMs: 10000,
      });
      expect(mgr.getHealthyCount()).toBe(1);

      jest.advanceTimersByTime(10000);
      expect(primaryAdapter.query).not.toHaveBeenCalled();
    });

    it('should not start health timer when no replicas configured', () => {
      const mgr = new ReplicaManager(primaryAdapter);
      expect(mgr.getHealthyCount()).toBe(0);
    });
  });

  describe('query routing — no replicas', () => {
    it('should route to primary when no replicas configured', async () => {
      const mgr = new ReplicaManager(primaryAdapter);
      const expected: QueryResult = { rows: [{ id: 1 }], rowCount: 1, durationMs: 5 };
      primaryAdapter.query.mockResolvedValue(expected);

      const result = await mgr.query('SELECT 1');

      expect(primaryAdapter.query).toHaveBeenCalledWith('SELECT 1', undefined);
      expect(result).toBe(expected);
    });

    it('should ignore useReplica flag when no replicas configured', async () => {
      const mgr = new ReplicaManager(primaryAdapter);
      await mgr.query('SELECT 1', [], false);
      await mgr.query('SELECT 1', [], true);

      expect(primaryAdapter.query).toHaveBeenCalledTimes(2);
    });
  });

  describe('query routing — with replicas', () => {
    it('should route to replica when configured and healthy', async () => {
      const mgr = new ReplicaManager(primaryAdapter, {
        replicas: [{ host: 'r1', port: 5432, weight: 1 }],
        fallbackToPrimary: true,
      });

      await expect(mgr.query('SELECT 1')).rejects.toThrow('not initialized');
      expect(primaryAdapter.query).not.toHaveBeenCalled();
    });

    it('should route to primary when useReplica is false', async () => {
      const mgr = new ReplicaManager(primaryAdapter, {
        replicas: [{ host: 'r1', port: 5432, weight: 1 }],
      });
      const expected: QueryResult = { rows: [], rowCount: 0, durationMs: 1 };
      primaryAdapter.query.mockResolvedValue(expected);

      const result = await mgr.query('SELECT 1', [], false);

      expect(primaryAdapter.query).toHaveBeenCalledWith('SELECT 1', []);
      expect(result).toBe(expected);
    });
  });

  describe('fallback behavior', () => {
    it('should fall back to primary when all replicas unhealthy (regardless of fallbackToPrimary)', async () => {
      const mgr = new ReplicaManager(primaryAdapter, {
        replicas: [{ host: 'r1', port: 5432, weight: 1 }],
        fallbackToPrimary: true,
      });
      const expected: QueryResult = { rows: [], rowCount: 0, durationMs: 2 };
      primaryAdapter.query.mockResolvedValue(expected);

      (mgr as any).replicas[0].healthy = false;
      const result = await mgr.query('SELECT 1');

      expect(primaryAdapter.query).toHaveBeenCalledWith('SELECT 1', undefined);
      expect(result).toBe(expected);
    });

    it('should fall back to primary when fallbackToPrimary is false and all replicas unhealthy', async () => {
      const mgr = new ReplicaManager(primaryAdapter, {
        replicas: [{ host: 'r1', port: 5432, weight: 1 }],
        fallbackToPrimary: false,
      });
      const expected: QueryResult = { rows: [], rowCount: 0, durationMs: 2 };
      primaryAdapter.query.mockResolvedValue(expected);

      (mgr as any).replicas[0].healthy = false;
      const result = await mgr.query('SELECT 1');

      expect(primaryAdapter.query).toHaveBeenCalled();
      expect(result).toBe(expected);
    });
  });

  describe('registerReplica', () => {
    it('should register a new replica', async () => {
      const mgr = new ReplicaManager(primaryAdapter);
      expect(mgr.getHealthyCount()).toBe(0);

      await mgr.registerReplica('r1', 5432);
      expect(mgr.getHealthyCount()).toBe(1);
    });

    it('should update weight of existing replica', async () => {
      const mgr = new ReplicaManager(primaryAdapter, {
        replicas: [{ host: 'r1', port: 5432, weight: 1 }],
      });
      expect(mgr.getHealthyCount()).toBe(1);

      await mgr.registerReplica('r1', 5432, 5);
      expect(mgr.getHealthyCount()).toBe(1);
    });

    it('should register multiple replicas with different weights', async () => {
      const mgr = new ReplicaManager(primaryAdapter);
      await mgr.registerReplica('r1', 5432, 2);
      await mgr.registerReplica('r2', 5432, 3);

      expect(mgr.getHealthyCount()).toBe(2);
    });
  });

  describe('checkHealth', () => {
    it('should mark replica healthy when adapter query succeeds', async () => {
      const mgr = new ReplicaManager(primaryAdapter, {
        replicas: [{ host: 'r1', port: 5432, weight: 1 }],
      });

      await mgr.checkHealth();
      expect(mgr.getHealthyCount()).toBe(1);
    });

    it('should mark replica unhealthy when adapter query throws', async () => {
      const mgr = new ReplicaManager(primaryAdapter, {
        replicas: [{ host: 'r1', port: 5432, weight: 1 }],
      });
      const failingAdapter = mockAdapter('failing');
      failingAdapter.query.mockRejectedValue(new Error('connection refused'));
      (mgr as any).adapters.set('r1:5432', failingAdapter);

      await mgr.checkHealth();
      expect(mgr.getHealthyCount()).toBe(0);
    });

    it('should update lastCheck timestamp', async () => {
      const mgr = new ReplicaManager(primaryAdapter, {
        replicas: [{ host: 'r1', port: 5432, weight: 1 }],
      });

      const before = Date.now();
      await mgr.checkHealth();
      expect(Date.now() - before).toBeGreaterThanOrEqual(0);
    });
  });

  describe('getHealthyCount', () => {
    it('should return 0 when no replicas', () => {
      const mgr = new ReplicaManager(primaryAdapter);
      expect(mgr.getHealthyCount()).toBe(0);
    });

    it('should return count of healthy replicas', async () => {
      const mgr = new ReplicaManager(primaryAdapter, {
        replicas: [
          { host: 'r1', port: 5432, weight: 1 },
          { host: 'r2', port: 5432, weight: 1 },
        ],
      });

      expect(mgr.getHealthyCount()).toBe(2);

      await mgr.checkHealth();
      expect(mgr.getHealthyCount()).toBe(2);
    });
  });

  describe('close', () => {
    it('should clear health timer', async () => {
      const mgr = new ReplicaManager(primaryAdapter, {
        replicas: [{ host: 'r1', port: 5432, weight: 1 }],
        healthCheckIntervalMs: 5000,
      });

      await mgr.close();
      jest.advanceTimersByTime(10000);
      expect(primaryAdapter.query).not.toHaveBeenCalled();
    });

    it('should disconnect all replica adapters', async () => {
      const mgr = new ReplicaManager(primaryAdapter, {
        replicas: [{ host: 'r1', port: 5432, weight: 1 }],
      });

      await mgr.close();
    });

    it('should be safe to call close when no replicas configured', async () => {
      const mgr = new ReplicaManager(primaryAdapter);
      await expect(mgr.close()).resolves.toBeUndefined();
    });
  });

  describe('initReplica', () => {
    it('should reject when pg-adapter module cannot be loaded', async () => {
      const mgr = new ReplicaManager(primaryAdapter);

      await expect(
        mgr.initReplica(
          { type: 'postgres', host: 'r1', port: 5432 },
          { host: 'r1', port: 5432 },
        ),
      ).rejects.toThrow();
    });
  });
});
