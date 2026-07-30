import { createRateLimiter, RateLimiter } from '../rate-limit';

describe('RateLimiter', () => {
  let limiter: RateLimiter;

  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-01-01T00:00:00.000Z'));
    limiter = createRateLimiter();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('allows the first request and sets remaining', () => {
    const result = limiter.check('user:1');
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(59);
    expect(result.retryAfter).toBe(0);
    expect(result.totalRequests).toBe(1);
  });

  it('blocks when exceeding max requests (default 60)', () => {
    const key = 'ip:127.0.0.1';
    for (let i = 0; i < 60; i++) {
      limiter.check(key);
    }
    const result = limiter.check(key);
    expect(result.allowed).toBe(false);
    expect(result.remaining).toBe(0);
    expect(result.totalRequests).toBe(61);
  });

  it('returns retryAfter for blocked request', () => {
    const key = 'ip:127.0.0.1';
    for (let i = 0; i < 61; i++) {
      limiter.check(key);
    }
    const result = limiter.check(key);
    expect(result.allowed).toBe(false);
    expect(result.retryAfter).toBe(120);
  });

  it('resets window after windowMs elapses', () => {
    const key = 'ip:test';
    limiter.check(key);
    jest.advanceTimersByTime(60_001);
    const result = limiter.check(key);
    expect(result.allowed).toBe(true);
    expect(result.totalRequests).toBe(1);
  });

  it('accepts custom configs', () => {
    const custom = createRateLimiter({
      default: { windowMs: 10_000, maxRequests: 2, blockDurationMs: 5_000, trackBy: 'ip' },
    });
    const key = 'ip:test';
    expect(custom.check(key).allowed).toBe(true);
    expect(custom.check(key).allowed).toBe(true);
    expect(custom.check(key).allowed).toBe(false);
  });

  it('buildKey uses trackBy from config', () => {
    const config = { windowMs: 60_000, maxRequests: 60, blockDurationMs: 120_000, trackBy: 'user' as const };
    expect(limiter.buildKey('abc', config)).toBe('user:abc');
  });

  it('buildKey defaults to ip when config omitted', () => {
    expect(limiter.buildKey('192.168.1.1')).toBe('ip:192.168.1.1');
  });

  it('getStats returns total and blocked key counts', () => {
    limiter.check('k1');
    limiter.check('k2');
    expect(limiter.getStats()).toEqual({ totalKeys: 2, blockedKeys: 0 });
  });

  it('resetKey removes a specific entry', () => {
    limiter.check('k1');
    expect(limiter.getStats().totalKeys).toBe(1);
    limiter.resetKey('k1');
    expect(limiter.getStats().totalKeys).toBe(0);
  });

  it('clear removes all entries', () => {
    limiter.check('k1');
    limiter.check('k2');
    limiter.clear();
    expect(limiter.getStats().totalKeys).toBe(0);
  });
});
