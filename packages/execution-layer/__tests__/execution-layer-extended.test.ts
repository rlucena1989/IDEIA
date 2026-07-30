import { CircuitBreaker, withRetry, createCircuitBreaker } from '../src/execution-layer';

describe('CircuitBreaker', () => {
  describe('createCircuitBreaker', () => {
    it('returns a new instance', () => {
      const cb = createCircuitBreaker({ threshold: 3, resetTimeoutMs: 1000, name: 'test' });
      expect(cb).toBeInstanceOf(CircuitBreaker);
    });
  });

  describe('getState', () => {
    it('starts closed', () => {
      const cb = new CircuitBreaker({ threshold: 3, resetTimeoutMs: 1000, name: 'test' });
      expect(cb.getState()).toBe('closed');
    });
  });

  describe('reset', () => {
    it('resets state to closed and clears failures', async () => {
      const cb = new CircuitBreaker({ threshold: 1, resetTimeoutMs: 10000, name: 'test' });
      await cb.call(async () => { throw new Error('fail'); });
      expect(cb.getState()).toBe('open');
      cb.reset();
      expect(cb.getState()).toBe('closed');
      const result = await cb.call(async () => 'ok');
      expect(result.success).toBe(true);
    });
  });

  describe('call with half-open', () => {
    it('transitions to closed on success in half-open state', async () => {
      const cb = new CircuitBreaker({ threshold: 1, resetTimeoutMs: 10, name: 'test' });
      await cb.call(async () => { throw new Error('fail'); });
      await new Promise(r => setTimeout(r, 20));
      expect(cb.getState()).toBe('half_open');
      const result = await cb.call(async () => 'recovered');
      expect(result.success).toBe(true);
      expect(cb.getState()).toBe('closed');
    });
  });
});

describe('withRetry', () => {
  it('uses exponential backoff', async () => {
    let tries = 0;
    const start = Date.now();
    const result = await withRetry(async () => { tries++; if (tries < 3) throw new Error('retry'); return 'done'; }, { maxRetries: 3, baseDelayMs: 5, strategy: 'exponential' });
    expect(result.success).toBe(true);
    expect(result.attempts).toBe(3);
    expect(Date.now() - start).toBeGreaterThanOrEqual(5 + 10);
  }, 10000);

  it('uses linear backoff', async () => {
    let tries = 0;
    const result = await withRetry(async () => { tries++; if (tries < 2) throw new Error('retry'); return 'done'; }, { maxRetries: 2, baseDelayMs: 5, strategy: 'linear' });
    expect(result.success).toBe(true);
  }, 10000);

  it('caps exponential backoff at 30s', async () => {
    const result = await withRetry(async () => { throw new Error('fail'); }, { maxRetries: 10, baseDelayMs: 30000, strategy: 'exponential' });
    expect(result.success).toBe(false);
  }, 15000);

  it('returns attempts count on failure', async () => {
    const result = await withRetry(async () => { throw new Error('fail'); }, { maxRetries: 5, baseDelayMs: 1, strategy: 'fixed' });
    expect(result.success).toBe(false);
    expect(result.attempts).toBe(5);
  });
});
