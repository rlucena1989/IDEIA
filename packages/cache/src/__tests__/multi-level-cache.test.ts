import { MultiLevelCache, MemoryCacheLevel } from '../multi-level-cache';

describe('MultiLevelCache', () => {
  it('should return undefined for missing key', async () => {
    const cache = new MultiLevelCache<string>();
    const result = await cache.get('missing');
    expect(result).toBeUndefined();
  });

  it('should store and retrieve values', async () => {
    const cache = new MultiLevelCache<string>();
    await cache.set('key1', 'value1');
    const result = await cache.get('key1');
    expect(result).toBe('value1');
  });

  it('should use fetcher when cache misses', async () => {
    const cache = new MultiLevelCache<string>();
    const fetcher = jest.fn().mockResolvedValue('fetched-value');
    const result = await cache.get('missing', fetcher);
    expect(result).toBe('fetched-value');
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it('should serve from L1 on subsequent calls', async () => {
    const cache = new MultiLevelCache<string>();
    const fetcher = jest.fn().mockResolvedValue('expensive');
    await cache.get('test', fetcher);
    const result = await cache.get('test', fetcher);
    expect(result).toBe('expensive');
    expect(fetcher).toHaveBeenCalledTimes(1); // Only called once
  });

  it('should cascade through L2 and L3', async () => {
    const l2 = new MemoryCacheLevel<string>();
    const l3 = new MemoryCacheLevel<string>();
    const cache = new MultiLevelCache<string>(l2, l3);

    l3.set('deep', 'from-l3', 999999);
    const result = await cache.get('deep');
    expect(result).toBe('from-l3');
    // Should now be promoted to L2 and L1
    expect(l2.get('deep')).toBe('from-l3');
  });

  it('should delete from all levels', async () => {
    const l2 = new MemoryCacheLevel<string>();
    const cache = new MultiLevelCache<string>(l2);
    await cache.set('del-test', 'value');
    expect(await cache.get('del-test')).toBe('value');
    await cache.delete('del-test');
    expect(await cache.get('del-test')).toBeUndefined();
    expect(l2.get('del-test')).toBeUndefined();
  });

  it('should clear all levels', async () => {
    const l2 = new MemoryCacheLevel<string>();
    const cache = new MultiLevelCache<string>(l2);
    await cache.set('a', '1');
    await cache.set('b', '2');
    await cache.clear();
    expect(await cache.get('a')).toBeUndefined();
    expect(await cache.get('b')).toBeUndefined();
  });

  it('should provide stats', async () => {
    const cache = new MultiLevelCache<string>();
    await cache.set('s', 'v');
    await cache.get('s');
    await cache.get('missing');
    const stats = cache.getStats();
    expect(stats.total).toBe(2);
    expect(stats.l1Hits).toBe(1);
    expect(stats.misses).toBe(1);
    expect(stats.overallHitRatio).toBeGreaterThan(0);
  });

  it('should handle L1 eviction when over max size', async () => {
    const cache = new MultiLevelCache<string>(undefined, undefined, { l1TtlMs: 60000, l2TtlMs: 300000, l3TtlMs: 3600000, l1MaxSize: 2 });
    await cache.set('a', '1');
    await cache.set('b', '2');
    await cache.set('c', '3');
    const stats = cache.getStats();
    expect(stats.l1Size).toBeLessThanOrEqual(2);
  });

  it('should handle fetcher errors gracefully', async () => {
    const cache = new MultiLevelCache<string>();
    const fetcher = jest.fn().mockRejectedValue(new Error('fetch failed'));
    const result = await cache.get('err', fetcher);
    expect(result).toBeUndefined();
  });
});
