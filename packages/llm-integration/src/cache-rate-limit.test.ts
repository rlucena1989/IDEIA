import { DefaultSemanticCache, DefaultRateLimiter } from './cache-rate-limit';
import { ChatResponse } from './types';

function makeResponse(overrides: Partial<ChatResponse> = {}): ChatResponse {
  return {
    id: 'r1',
    model: 'test-model',
    provider: 'test',
    content: 'test response',
    finishReason: 'stop',
    latencyMs: 10,
    cached: false,
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}

describe('DefaultSemanticCache', () => {
  let cache: DefaultSemanticCache;

  beforeEach(() => {
    cache = new DefaultSemanticCache();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should store and retrieve a cached response with cached: true', async () => {
    const response = makeResponse({ content: 'stored' });
    await cache.set('key1', response);
    const result = await cache.get('key1');
    expect(result).toBeDefined();
    expect(result!.content).toBe('stored');
    expect(result!.cached).toBe(true);
  });

  it('should return undefined for a missing key', async () => {
    const result = await cache.get('nonexistent');
    expect(result).toBeUndefined();
  });

  it('should return undefined for an expired entry', async () => {
    await cache.set('key1', makeResponse());
    jest.advanceTimersByTime(5 * 60 * 1000 + 1);
    const result = await cache.get('key1');
    expect(result).toBeUndefined();
  });

  it('should remove an entry after invalidation', async () => {
    await cache.set('key1', makeResponse());
    await cache.invalidate('key1');
    const result = await cache.get('key1');
    expect(result).toBeUndefined();
  });

  it('should clear all entries', async () => {
    await cache.set('key1', makeResponse());
    await cache.set('key2', makeResponse());
    await cache.clear();
    expect(await cache.get('key1')).toBeUndefined();
    expect(await cache.get('key2')).toBeUndefined();
  });
});

describe('DefaultRateLimiter', () => {
  let limiter: DefaultRateLimiter;

  beforeEach(() => {
    limiter = new DefaultRateLimiter({ maxTokens: 3, refillRate: 10, refillIntervalMs: 10000 });
  });

  it('should allow requests when tokens remain', async () => {
    const allowed = await limiter.checkLimit('test-provider');
    expect(allowed).toBe(true);
  });

  it('should return remaining tokens count', async () => {
    const remaining = await limiter.getRemainingTokens('test-provider');
    expect(remaining).toBe(3);
  });

  it('should consume tokens on increment', async () => {
    await limiter.increment('test-provider');
    const remaining = await limiter.getRemainingTokens('test-provider');
    expect(remaining).toBe(2);
  });

  it('should block when tokens exhausted', async () => {
    await limiter.increment('test-provider');
    await limiter.increment('test-provider');
    await limiter.increment('test-provider');
    const allowed = await limiter.checkLimit('test-provider');
    expect(allowed).toBe(false);
  });

  it('should return 0 remaining tokens when exhausted', async () => {
    await limiter.increment('test-provider');
    await limiter.increment('test-provider');
    await limiter.increment('test-provider');
    const remaining = await limiter.getRemainingTokens('test-provider');
    expect(remaining).toBe(0);
  });

  it('should not allow incrementing below zero', async () => {
    for (let i = 0; i < 10; i++) {
      await limiter.increment('test-provider');
    }
    const remaining = await limiter.getRemainingTokens('test-provider');
    expect(remaining).toBe(0);
  });

  it('should refill tokens after interval', async () => {
    jest.useFakeTimers();
    limiter = new DefaultRateLimiter({ maxTokens: 3, refillRate: 3, refillIntervalMs: 1000 });
    await limiter.increment('test-provider');
    await limiter.increment('test-provider');
    await limiter.increment('test-provider');
    expect(await limiter.getRemainingTokens('test-provider')).toBe(0);

    jest.advanceTimersByTime(1000);
    expect(await limiter.getRemainingTokens('test-provider')).toBe(3);
    jest.useRealTimers();
  });

  it('should handle independent buckets per provider', async () => {
    await limiter.increment('provider-a');
    await limiter.increment('provider-a');
    expect(await limiter.getRemainingTokens('provider-a')).toBe(1);
    expect(await limiter.getRemainingTokens('provider-b')).toBe(3);
  });

  it('should reset bucket', async () => {
    await limiter.increment('test-provider');
    await limiter.reset('test-provider');
    expect(await limiter.getRemainingTokens('test-provider')).toBe(3);
  });
});
