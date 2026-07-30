import { MemoryCache } from '../src/memory-cache';
import { CacheOptimizer } from '../src/cache-optimizer';
import type { WarmupEntry } from '../src/cache-layer';

describe('Cache Warmup', () => {
  let cache: MemoryCache;

  beforeEach(() => {
    cache = new MemoryCache({ maxSize: 100, ttlMs: 60000 });
  });

  describe('MemoryCache warmup', () => {
    it('should warmup from an array of entries', async () => {
      const count = await cache.warmup(() => [
        { key: 'a', value: 1 },
        { key: 'b', value: 'two' },
        { key: 'c', value: { nested: true } },
      ]);
      expect(count).toBe(3);
      expect(await cache.get('a')).toBe(1);
      expect(await cache.get('b')).toBe('two');
      expect(await cache.get('c')).toEqual({ nested: true });
    });

    it('should warmup from an async data source', async () => {
      const count = await cache.warmup(async () => {
        return [
          { key: 'async-1', value: 'val1', ttlMs: 5000 },
          { key: 'async-2', value: 'val2' },
        ];
      });
      expect(count).toBe(2);
      expect(await cache.get('async-1')).toBe('val1');
      expect(await cache.get('async-2')).toBe('val2');
    });

    it('should return 0 for empty data source', async () => {
      const count = await cache.warmup(() => []);
      expect(count).toBe(0);
    });

    it('should apply custom TTL during warmup', async () => {
      await cache.warmup(() => [
        { key: 'ephemeral', value: 'gone', ttlMs: -1 },
      ]);
      expect(await cache.get('ephemeral')).toBeUndefined();
    });

    it('should handle warmup within cache size limits', async () => {
      const smallCache = new MemoryCache({ maxSize: 2, ttlMs: 60000 });
      const count = await smallCache.warmup(() => [
        { key: 'a', value: 1 },
        { key: 'b', value: 2 },
        { key: 'c', value: 3 },
      ]);
      expect(count).toBe(3);
      const keys = await smallCache.keys();
      expect(keys.length).toBeLessThanOrEqual(2);
    });

    it('should skip entries with undefined values', async () => {
      const count = await cache.warmup(() => [
        { key: 'valid', value: 'ok' },
        { key: 'invalid', value: undefined },
      ] as WarmupEntry[]);
      expect(count).toBe(1);
      expect(await cache.get('valid')).toBe('ok');
    });

    it('should handle data source errors gracefully', async () => {
      await expect(cache.warmup(() => { throw new Error('source error'); })).rejects.toThrow('source error');
    });
  });

  describe('CacheOptimizer warmup', () => {
    let optimizer: CacheOptimizer;

    beforeEach(() => {
      optimizer = new CacheOptimizer(cache);
    });

    afterEach(() => {
      optimizer.stop();
    });

    it('should delegate warmup to underlying cache', async () => {
      const count = await optimizer.warmup(() => [
        { key: 'opt-a', value: 10 },
        { key: 'opt-b', value: 20 },
      ]);
      expect(count).toBe(2);
      expect(await optimizer.get('opt-a')).toBe(10);
      expect(await optimizer.get('opt-b')).toBe(20);
    });

    it('should track access for warmed entries', async () => {
      await optimizer.warmup(() => [
        { key: 'tracked', value: 'yes' },
      ]);
      await optimizer.get('tracked');
      const stats = await optimizer.stats();
      expect(stats.hits).toBe(1);
    });
  });
});
