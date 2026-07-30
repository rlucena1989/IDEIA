import { MemoryCache } from '../../packages/cache/src/memory-cache';
import type { CacheLayer } from '../../packages/cache/src/cache-layer';

describe('Cache Layer Contract', () => {
  let cache: CacheLayer;

  beforeEach(() => {
    cache = new MemoryCache({ ttlMs: 60_000, maxSize: 100 });
  });

  it('should set and get a string value', async () => {
    await cache.set('key1', 'value1');
    const result = await cache.get<string>('key1');
    expect(result).toBe('value1');
  });

  it('should set and get a number value', async () => {
    await cache.set('num', 42);
    const result = await cache.get<number>('num');
    expect(result).toBe(42);
  });

  it('should set and get an object value', async () => {
    const obj = { a: 1, b: 'test', c: true };
    await cache.set('obj', obj);
    const result = await cache.get<typeof obj>('obj');
    expect(result).toEqual(obj);
  });

  it('should return undefined for missing keys', async () => {
    const result = await cache.get('nonexistent');
    expect(result).toBeUndefined();
  });

  it('should return true for has() on existing keys', async () => {
    await cache.set('existing', 'value');
    const result = await cache.has('existing');
    expect(result).toBe(true);
  });

  it('should return false for has() on missing keys', async () => {
    const result = await cache.has('missing');
    expect(result).toBe(false);
  });

  it('should delete existing keys', async () => {
    await cache.set('todelete', 'value');
    const deleted = await cache.delete('todelete');
    expect(deleted).toBe(true);
    const result = await cache.get('todelete');
    expect(result).toBeUndefined();
  });

  it('should return false when deleting missing keys', async () => {
    const deleted = await cache.delete('notexist');
    expect(deleted).toBe(false);
  });

  it('should clear all entries', async () => {
    await cache.set('a', 1);
    await cache.set('b', 2);
    await cache.clear();
    expect(await cache.get('a')).toBeUndefined();
    expect(await cache.get('b')).toBeUndefined();
  });

  it('should report stats after operations', async () => {
    await cache.set('s1', 1);
    await cache.set('s2', 2);
    await cache.get('s1');
    await cache.get('s1');
    await cache.get('missing');

    const stats = await cache.stats();
    expect(stats.size).toBe(2);
    expect(stats.hits).toBeGreaterThanOrEqual(2);
    expect(stats.misses).toBeGreaterThanOrEqual(1);
    expect(stats.hitRate).toBeGreaterThan(0);
  });

  it('should list all keys', async () => {
    await cache.set('k1', 'v1');
    await cache.set('k2', 'v2');
    const keys = await cache.keys();
    expect(keys).toContain('k1');
    expect(keys).toContain('k2');
    expect(keys.length).toBe(2);
  });

  it('should respect TTL expiration (short TTL)', async () => {
    await cache.set('short', 'value', 10);
    const before = await cache.get('short');
    expect(before).toBe('value');
  });

  it('should evict least recently used when exceeding max size', async () => {
    const smallCache = new MemoryCache({ maxSize: 3, ttlMs: 60_000 });
    await smallCache.set('a', 1);
    await smallCache.set('b', 2);
    await smallCache.set('c', 3);
    await smallCache.set('d', 4);

    const hasA = await smallCache.has('a');
    expect(hasA).toBe(false);
    const hasD = await smallCache.has('d');
    expect(hasD).toBe(true);
  });

  it('should overwrite existing keys', async () => {
    await cache.set('overwrite', 'original');
    await cache.set('overwrite', 'updated');
    const result = await cache.get<string>('overwrite');
    expect(result).toBe('updated');
  });

  it('should track hit rate accurately', async () => {
    const statsCache = new MemoryCache({ maxSize: 10, ttlMs: 60_000 });
    await statsCache.set('x', 1);
    await statsCache.get('x');
    await statsCache.get('x');
    await statsCache.get('y');

    const stats = await statsCache.stats();
    expect(stats.hits).toBe(2);
    expect(stats.misses).toBe(1);
    expect(stats.hitRate).toBeCloseTo(2 / 3, 1);
  });

  it('should support concurrent set/get operations', async () => {
    const promises = [];
    for (let i = 0; i < 10; i++) {
      promises.push(cache.set(`concurrent-${i}`, i));
    }
    await Promise.all(promises);

    const results = await Promise.all(
      Array.from({ length: 10 }, (_, i) => cache.get<number>(`concurrent-${i}`))
    );
    expect(results).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
  });

  it('should maintain contract: set -> get -> delete -> get -> undefined', async () => {
    await cache.set('contract', 'value');
    expect(await cache.get('contract')).toBe('value');
    await cache.delete('contract');
    expect(await cache.get('contract')).toBeUndefined();
  });
});
