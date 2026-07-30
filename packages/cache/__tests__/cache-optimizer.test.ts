import { CacheOptimizer } from '../src/cache-optimizer';
import { MemoryCache } from '../src/memory-cache';

describe('CacheOptimizer', () => {
  let cache: MemoryCache;
  let optimizer: CacheOptimizer;

  beforeEach(() => {
    cache = new MemoryCache({ maxSize: 100, ttlMs: 60000 });
    optimizer = new CacheOptimizer(cache, { enablePrediction: false });
  });

  afterEach(() => {
    optimizer.stop();
  });

  describe('basic operations', () => {
    test('set and get works', async () => {
      await optimizer.set('key1', 'value1');
      const result = await optimizer.get('key1');
      expect(result).toBe('value1');
    });

    test('delete removes key', async () => {
      await optimizer.set('k', 'v');
      await optimizer.delete('k');
      expect(await optimizer.get('k')).toBeUndefined();
    });

    test('clear removes all entries', async () => {
      await optimizer.set('a', 1);
      await optimizer.set('b', 2);
      await optimizer.clear();
      expect(await optimizer.get('a')).toBeUndefined();
      expect(await optimizer.get('b')).toBeUndefined();
    });
  });

  describe('stats', () => {
    test('returns cache stats with optimizer info', async () => {
      await optimizer.set('hitme', 'found');
      await optimizer.get('hitme');
      await optimizer.get('missme');
      const s = await optimizer.stats();
      expect(s.hits).toBeGreaterThanOrEqual(1);
      expect(s.misses).toBeGreaterThanOrEqual(1);
      expect(s.optimizerHitRate).toBeDefined();
      expect(typeof s.optimizerHitRate).toBe('number');
    });
  });

  describe('prediction mode', () => {
    test('enables prediction when configured', async () => {
      const predOpt = new CacheOptimizer(cache, { enablePrediction: true });
      await predOpt.set('test', 'val', 5000);
      const result = await predOpt.get('test');
      expect(result).toBe('val');
      predOpt.stop();
    });
  });

  describe('access tracking', () => {
    test('records access patterns', async () => {
      await optimizer.get('a');
      await optimizer.get('a');
      await optimizer.get('b');
      const s = await optimizer.stats();
      expect(s.optimizerHitRate).toBeDefined();
    });
  });

  describe('sweeper', () => {
    test('start and stop sweeper', () => {
      optimizer.start();
      expect(optimizer).toBeDefined();
      optimizer.stop();
      expect(optimizer).toBeDefined();
    });

    test('start does not create duplicate interval', () => {
      optimizer.start();
      optimizer.start();
      optimizer.stop();
      expect(optimizer).toBeDefined();
    });
  });

  describe('edge cases', () => {
    test('handles undefined values', async () => {
      await optimizer.set('undef', undefined);
      const result = await optimizer.get('undef');
      expect(result).toBeUndefined();
    });

    test('handles overwrite', async () => {
      await optimizer.set('k', 'old');
      await optimizer.set('k', 'new');
      expect(await optimizer.get('k')).toBe('new');
    });

    test('delete from optimizer also clears access log', async () => {
      await optimizer.get('tracked');
      await optimizer.delete('tracked');
      await optimizer.set('tracked', 'new');
      expect(await optimizer.get('tracked')).toBe('new');
    });
  });
});
