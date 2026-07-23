import { CircuitBreaker, withRetry } from '../src/execution-layer';
describe('CircuitBreaker', () => {
  it('should allow calls when closed', async () => {
    const cb = new CircuitBreaker({ threshold: 3, resetTimeoutMs: 1000, name: 'test' });
    const result = await cb.call(async () => 'ok');
    expect(result.success).toBe(true); expect(result.data).toBe('ok');
  });
  it('should open after threshold', async () => {
    const cb = new CircuitBreaker({ threshold: 2, resetTimeoutMs: 10000, name: 'test' });
    await cb.call(async () => { throw new Error('fail'); });
    await cb.call(async () => { throw new Error('fail'); });
    expect(cb.getState()).toBe('open');
    const result = await cb.call(async () => 'should not reach');
    expect(result.success).toBe(false); expect(result.error).toContain('Circuit open');
  });
  it('should reset after timeout', async () => {
    const cb = new CircuitBreaker({ threshold: 1, resetTimeoutMs: 10, name: 'test' });
    await cb.call(async () => { throw new Error('fail'); });
    await new Promise(r => setTimeout(r, 20));
    const result = await cb.call(async () => 'recovered');
    expect(result.success).toBe(true);
  });
});
describe('withRetry', () => {
  it('should succeed on first try', async () => {
    const result = await withRetry(async () => 'ok', { maxRetries: 3, baseDelayMs: 10, strategy: 'fixed' });
    expect(result.success).toBe(true); expect(result.attempts).toBe(1);
  });
  it('should retry on failure', async () => {
    let tries = 0;
    const result = await withRetry(async () => { tries++; if (tries < 3) throw new Error('not yet'); return 'done'; }, { maxRetries: 3, baseDelayMs: 10, strategy: 'fixed' });
    expect(result.success).toBe(true); expect(result.attempts).toBe(3);
  });
  it('should fail after max retries', async () => {
    const result = await withRetry(async () => { throw new Error('always fails'); }, { maxRetries: 2, baseDelayMs: 10, strategy: 'fixed' });
    expect(result.success).toBe(false); expect(result.attempts).toBe(2);
  });
});
