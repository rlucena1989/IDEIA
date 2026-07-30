import { MemoryCache } from '../src/memory-cache';

describe('MemoryCache LRU Eviction', () => {
  test('evicts least recently used when over maxSize', async () => {
    const c = new MemoryCache({ maxSize: 3, ttlMs: 60000 });
    await c.set('a', 1);
    await c.set('b', 2);
    await c.set('c', 3);
    await c.set('d', 4);
    const hasA = await c.has('a');
    expect(hasA).toBe(false);
    expect(await c.has('b')).toBe(true);
    expect(await c.has('c')).toBe(true);
    expect(await c.has('d')).toBe(true);
  });

  test('promotes accessed keys to most recently used', async () => {
    const c = new MemoryCache({ maxSize: 3, ttlMs: 60000 });
    await c.set('a', 1);
    await c.set('b', 2);
    await c.set('c', 3);
    await c.get('a');
    await c.set('d', 4);
    expect(await c.has('a')).toBe(true);
    expect(await c.has('b')).toBe(false);
    expect(await c.has('c')).toBe(true);
    expect(await c.has('d')).toBe(true);
  });

  test('evicts oldest when all are recently used', async () => {
    const c = new MemoryCache({ maxSize: 2, ttlMs: 60000 });
    await c.set('x', 10);
    await c.set('y', 20);
    await c.set('z', 30);
    expect(await c.has('x')).toBe(false);
    const keys = await c.keys();
    expect(keys.sort()).toEqual(['y', 'z']);
  });

  test('handles maxSize of 1', async () => {
    const c = new MemoryCache({ maxSize: 1, ttlMs: 60000 });
    await c.set('a', 1);
    await c.set('b', 2);
    expect(await c.has('a')).toBe(false);
    expect(await c.get('b')).toBe(2);
  });

  test('eviction increments eviction counter', async () => {
    const c = new MemoryCache({ maxSize: 2, ttlMs: 60000 });
    await c.set('a', 1);
    await c.set('b', 2);
    await c.set('c', 3);
    const s = await c.stats();
    expect(s.evictions).toBeGreaterThanOrEqual(1);
  });
});

describe('MemoryCache TTL Eviction', () => {
  test('expires entries with short TTL', async () => {
    const c = new MemoryCache({ ttlMs: 60000 });
    await c.set('fast', 'gone', 10);
    await new Promise(r => setTimeout(r, 20));
    expect(await c.get('fast')).toBeUndefined();
  });

  test('keeps entries within TTL', async () => {
    const c = new MemoryCache({ ttlMs: 60000 });
    await c.set('persist', 'stay', 5000);
    expect(await c.get('persist')).toBe('stay');
  });

  test('expired entries count toward evictions', async () => {
    const c = new MemoryCache({ ttlMs: 60000 });
    await c.set('temp', 'val', -1000);
    await c.get('temp');
    const s = await c.stats();
    expect(s.evictions).toBeGreaterThanOrEqual(1);
  });

  test('background sweeper removes expired entries', async () => {
    const c = new MemoryCache({ ttlMs: 60000 });
    await c.set('willExpire', 'gone', 10);
    await c.set('willStay', 'here', 5000);
    c.startSweeper(5);
    await new Promise(r => setTimeout(r, 30));
    c.stopSweeper();
    expect(await c.has('willExpire')).toBe(false);
    expect(await c.has('willStay')).toBe(true);
  });

  test('default TTL is applied when not specified', async () => {
    const c = new MemoryCache({ ttlMs: 100 });
    await c.set('defaultTtl', 'val');
    expect(await c.get('defaultTtl')).toBe('val');
  });
});

describe('MemoryCache getStats', () => {
  test('returns detailed stats', async () => {
    const c = new MemoryCache({ maxSize: 100, ttlMs: 60000 });
    await c.set('a', 1);
    await c.set('b', 2);
    await c.get('a');
    await c.get('a');
    const s = await c.getStats();
    expect(s.maxSize).toBe(100);
    expect(s.defaultTtlMs).toBe(60000);
    expect(s.totalEntries).toBe(2);
    expect(s.hitEntries).toBeGreaterThanOrEqual(1);
    expect(s.oldestEntryAge).toBeGreaterThanOrEqual(0);
    expect(s.hits).toBeGreaterThanOrEqual(2);
  });
});

describe('MemoryCache resize', () => {
  test('resize to smaller size evicts entries', async () => {
    const c = new MemoryCache({ maxSize: 10, ttlMs: 60000 });
    for (let i = 0; i < 5; i++) await c.set(`k${i}`, i);
    await c.resize(2);
    const keys = await c.keys();
    expect(keys.length).toBeLessThanOrEqual(2);
  });

  test('resize to larger size allows more entries', async () => {
    const c = new MemoryCache({ maxSize: 3, ttlMs: 60000 });
    await c.set('a', 1);
    await c.set('b', 2);
    await c.set('c', 3);
    await c.resize(5);
    await c.set('d', 4);
    await c.set('e', 5);
    const keys = await c.keys();
    expect(keys.length).toBe(5);
  });

  test('resize to 1 evicts all but one', async () => {
    const c = new MemoryCache({ maxSize: 10, ttlMs: 60000 });
    for (let i = 0; i < 5; i++) await c.set(`k${i}`, i);
    await c.resize(1);
    const keys = await c.keys();
    expect(keys.length).toBe(1);
  });
});

describe('MemoryCache Edge Cases', () => {
  test('set same key updates value and resets TTL', async () => {
    const c = new MemoryCache({ ttlMs: 60000 });
    await c.set('k', 'old', 100000);
    await c.set('k', 'new', 10);
    await new Promise(r => setTimeout(r, 20));
    expect(await c.get('k')).toBeUndefined();
  });

  test('delete returns false for missing key', async () => {
    const c = new MemoryCache();
    expect(await c.delete('nonexistent')).toBe(false);
  });

  test('has returns false for missing key', async () => {
    const c = new MemoryCache();
    expect(await c.has('nothing')).toBe(false);
  });

  test('getStats with empty cache', async () => {
    const c = new MemoryCache({ maxSize: 50, ttlMs: 30000 });
    const s = await c.getStats();
    expect(s.totalEntries).toBe(0);
    expect(s.hitEntries).toBe(0);
    expect(s.oldestEntryAge).toBe(0);
    expect(s.maxSize).toBe(50);
  });
});
