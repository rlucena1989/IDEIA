import { LLMConnectionPool } from './connection-pool';

describe('LLMConnectionPool', () => {
  let pool: LLMConnectionPool;

  beforeEach(() => {
    pool = new LLMConnectionPool({
      maxPoolSize: 3,
      idleTimeoutMs: 5000,
      acquireTimeoutMs: 1000,
      keepAliveMs: 5000,
      healthCheckIntervalMs: 10000,
    });
  });

  afterEach(() => {
    pool.destroy();
  });

  it('should acquire a connection', async () => {
    const conn = await pool.acquire('ollama', 'llama3');
    expect(conn).toBeDefined();
    expect(conn.provider).toBe('ollama');
    expect(conn.model).toBe('llama3');
    expect(conn.active).toBe(true);
    expect(conn.healthy).toBe(true);
  });

  it('should reuse idle connections', async () => {
    const conn1 = await pool.acquire('ollama', 'llama3');
    pool.release(conn1);
    const conn2 = await pool.acquire('ollama', 'llama3');
    expect(conn2.id).toBe(conn1.id);
    expect(conn2.active).toBe(true);
  });

  it('should create different connections for different provider/model', async () => {
    const conn1 = await pool.acquire('ollama', 'llama3');
    const conn2 = await pool.acquire('openai', 'gpt-4');
    expect(conn1.id).not.toBe(conn2.id);
  });

  it('should enforce max pool size', async () => {
    const conn1 = await pool.acquire('ollama', 'llama3');
    const conn2 = await pool.acquire('ollama', 'llama3');
    const conn3 = await pool.acquire('ollama', 'llama3');
    expect(conn1).toBeDefined();
    expect(conn2).toBeDefined();
    expect(conn3).toBeDefined();
    await expect(pool.acquire('ollama', 'llama3', 200)).rejects.toThrow('timeout');
  });

  it('should release a connection and allow re-acquire', async () => {
    const conn1 = await pool.acquire('ollama', 'llama3');
    pool.release(conn1);
    const conn3 = await pool.acquire('ollama', 'llama3');
    expect(conn3.id).toBe(conn1.id);
    expect(conn3.active).toBe(true);
  });

  it('should return correct active count', async () => {
    expect(pool.getActiveCount()).toBe(0);
    const conn1 = await pool.acquire('ollama', 'llama3');
    expect(pool.getActiveCount()).toBe(1);
    const conn2 = await pool.acquire('openai', 'gpt-4');
    expect(pool.getActiveCount()).toBe(2);
    pool.release(conn1);
    expect(pool.getActiveCount()).toBe(1);
    pool.release(conn2);
    expect(pool.getActiveCount()).toBe(0);
  });

  it('should return correct idle count', async () => {
    const conn = await pool.acquire('ollama', 'llama3');
    expect(pool.getIdleCount()).toBe(0);
    pool.release(conn);
    expect(pool.getIdleCount()).toBe(1);
  });

  it('should return wait count when pool is saturated', async () => {
    const c1 = await pool.acquire('ollama', 'llama3');
    const c2 = await pool.acquire('ollama', 'llama3');
    const c3 = await pool.acquire('ollama', 'llama3');
    const acquirePromise = pool.acquire('ollama', 'llama3', 5000);
    expect(pool.getWaitCount()).toBe(1);
    pool.release(c1);
    const result = await acquirePromise;
    expect(result).toBeDefined();
    pool.release(c2);
    pool.release(c3);
  });

  it('should stop and reject waiters', async () => {
    await pool.acquire('ollama', 'llama3');
    await pool.acquire('ollama', 'llama3');
    await pool.acquire('ollama', 'llama3');
    const acquirePromise = pool.acquire('ollama', 'llama3', 2000);
    pool.stop();
    await expect(acquirePromise).rejects.toThrow('stopped');
  });

  it('should release connections by provider', async () => {
    const conn1 = await pool.acquire('ollama', 'llama3');
    await pool.acquire('openai', 'gpt-4');
    expect(pool.getActiveCount()).toBe(2);
    pool.releaseByProvider('ollama');
    expect(conn1.active).toBe(false);
    expect(pool.getActiveCount()).toBe(1);
  });

  it('should getStats with waitCount', async () => {
    await pool.acquire('ollama', 'llama3');
    await pool.acquire('ollama', 'llama3');
    await pool.acquire('ollama', 'llama3');
    const ignore = pool.acquire('ollama', 'llama3', 200).catch(() => {});
    const stats = pool.getStats();
    expect(stats.waitCount).toBe(1);
    await ignore;
  });
});
