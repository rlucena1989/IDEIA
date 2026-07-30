import { MemoryCache } from '../src/memory-cache';

describe('MemoryCache Metrics', () => {
  test('hitRate returns 0 on empty cache', () => {
    const c = new MemoryCache();
    expect(c.hitRate).toBe(0);
  });

  test('hitRate returns correct ratio', async () => {
    const c = new MemoryCache();
    await c.set('a', 1);
    await c.get('a');
    await c.get('b');
    await c.get('b');
    expect(c.hitRate).toBeCloseTo(1 / 3, 5);
  });

  test('hitRate after clears resets to 0', async () => {
    const c = new MemoryCache();
    await c.set('a', 1);
    await c.get('a');
    expect(c.hitRate).toBe(1);
    await c.clear();
    expect(c.hitRate).toBe(0);
  });

  test('getMetrics returns detailed structure', async () => {
    const c = new MemoryCache({ maxSize: 100 });
    await c.set('a', 1, 60000);
    await c.set('b', 2, 60000);
    await c.get('a');
    await c.get('a');
    await c.get('b');
    await c.get('missing');
    const m = await c.getMetrics();
    expect(m.hits).toBe(3);
    expect(m.misses).toBe(1);
    expect(m.totalRequests).toBe(4);
    expect(m.hitRate).toBe(0.75);
    expect(m.size).toBe(2);
    expect(m.maxSize).toBe(100);
    expect(m.utilizationPercent).toBe(2);
    expect(m.hitEntries).toBe(2);
    expect(m.coldEntries).toBe(0);
    expect(m.oldestEntryAge).toBeGreaterThanOrEqual(0);
    expect(m.averageEntryAge).toBeGreaterThanOrEqual(0);
  });

  test('getMetrics identifies cold entries', async () => {
    const c = new MemoryCache();
    await c.set('hot', 1);
    await c.set('cold', 2);
    await c.get('hot');
    const m = await c.getMetrics();
    expect(m.hitEntries).toBe(1);
    expect(m.coldEntries).toBe(1);
  });

  test('getMetrics after eviction reflects correct size', async () => {
    const c = new MemoryCache({ maxSize: 2 });
    await c.set('a', 1);
    await c.set('b', 2);
    await c.set('c', 3);
    const m = await c.getMetrics();
    expect(m.size).toBe(2);
    expect(m.evictions).toBe(1);
  });
});
