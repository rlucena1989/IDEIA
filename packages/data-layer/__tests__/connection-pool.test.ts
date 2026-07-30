jest.mock('@ideia/logger');

import { ConnectionPool } from '../src/connection-pool';

type MockConn = { id: number };

describe('ConnectionPool', () => {
  let connectFn: jest.Mock<Promise<MockConn>>;
  let disconnectFn: jest.Mock<Promise<void>>;
  let pool: ConnectionPool<MockConn>;

  beforeEach(() => {
    let counter = 0;
    connectFn = jest.fn().mockImplementation(async () => ({ id: ++counter }));
    disconnectFn = jest.fn().mockResolvedValue(undefined);
  });

  afterEach(async () => {
    if (pool) await pool.close();
  });

  describe('constructor', () => {
    it('should initialize with minimum connections', async () => {
      pool = new ConnectionPool(connectFn, disconnectFn, { minConnections: 2, maxConnections: 10 });
      await new Promise(r => setTimeout(r, 50));
      expect(connectFn).toHaveBeenCalled();
    }, 10000);

    it('should use default config values', () => {
      pool = new ConnectionPool(connectFn, disconnectFn);
      const config = pool.getConfig();
      expect(config.maxConnections).toBe(20);
      expect(config.minConnections).toBe(2);
      expect(config.idleTimeoutMs).toBe(30000);
    });
  });

  describe('acquire', () => {
    it('should acquire a connection', async () => {
      pool = new ConnectionPool(connectFn, disconnectFn, { minConnections: 0, maxConnections: 10 });
      const { conn, release } = await pool.acquire();
      expect(conn.id).toBeGreaterThan(0);
      release();
    });

    it('should create new connection when pool is not full', async () => {
      pool = new ConnectionPool(connectFn, disconnectFn, { minConnections: 0, maxConnections: 5 });
      const { conn, release } = await pool.acquire();
      expect(conn.id).toBe(1);
      release();
    });

    it('should queue when pool is full and get released connection', async () => {
      pool = new ConnectionPool(connectFn, disconnectFn, { minConnections: 0, maxConnections: 1, acquireTimeoutMs: 5000 });
      const { release } = await pool.acquire();

      const acquirePromise = pool.acquire();
      release();
      const result = await acquirePromise;
      expect(result.conn).toBeDefined();

      await pool.close();
    }, 10000);

    it('should timeout when queued too long', async () => {
      pool = new ConnectionPool(connectFn, disconnectFn, { minConnections: 0, maxConnections: 1, acquireTimeoutMs: 100 });
      await pool.acquire();
      await expect(pool.acquire()).rejects.toThrow('Connection acquire timeout');
      await pool.close();
    }, 10000);
  });

  describe('release', () => {
    it('should mark connection as idle on release', async () => {
      pool = new ConnectionPool(connectFn, disconnectFn, { minConnections: 0, maxConnections: 5 });
      const { release } = await pool.acquire();
      release();
      const metrics = pool.getMetrics();
      expect(metrics.active).toBe(0);
    });
  });

  describe('getMetrics', () => {
    it('should return correct metrics', async () => {
      pool = new ConnectionPool(connectFn, disconnectFn, { minConnections: 0, maxConnections: 10 });
      let metrics = pool.getMetrics();
      expect(metrics.total).toBe(0);

      await pool.acquire();
      metrics = pool.getMetrics();
      expect(metrics.active).toBe(1);
    });
  });

  describe('setValidator', () => {
    it('should set validation function', () => {
      pool = new ConnectionPool(connectFn, disconnectFn);
      pool.setValidator((conn: MockConn | null) => conn !== null);
      expect(pool).toBeDefined();
    });
  });

  describe('getConfig', () => {
    it('should return copy of config', () => {
      pool = new ConnectionPool(connectFn, disconnectFn, { maxConnections: 5 });
      const config = pool.getConfig();
      expect(config.maxConnections).toBe(5);
    });
  });

  describe('close', () => {
    it('should disconnect all connections', async () => {
      pool = new ConnectionPool(connectFn, disconnectFn, { minConnections: 0, maxConnections: 5 });
      await pool.acquire();
      await pool.close();
      expect(disconnectFn).toHaveBeenCalled();
    }, 10000);

    it('should reject waiting acquires on close', async () => {
      pool = new ConnectionPool(connectFn, disconnectFn, { minConnections: 0, maxConnections: 1 });
      await pool.acquire();
      const acquirePromise = pool.acquire();
      await pool.close();
      await expect(acquirePromise).rejects.toThrow('Pool closed');
    }, 10000);
  });

  describe('cleanup idle connections', () => {
    it('should remove idle connections above min', async () => {
      jest.useFakeTimers();
      pool = new ConnectionPool(connectFn, disconnectFn, { minConnections: 1, maxConnections: 5, idleTimeoutMs: 100 });
      await pool.acquire();
      const { release } = await pool.acquire();
      release();
      jest.advanceTimersByTime(20000);
      jest.useRealTimers();
      const metrics = pool.getMetrics();
      expect(metrics.idle).toBeLessThanOrEqual(1);
    }, 10000);
  });
});
