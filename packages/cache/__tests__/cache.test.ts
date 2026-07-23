import { MemoryCache } from '../src/memory-cache';

describe('MemoryCache', () => {
  test('can be constructed', () => {
    const c = new MemoryCache();
    expect(c).toBeDefined();
  });

  test('set and get works', async () => {
    const c = new MemoryCache();
    await c.set('key1', 'value1');
    const result = await c.get('key1');
    expect(result).toBe('value1');
  });

  test('has returns true for existing keys', async () => {
    const c = new MemoryCache();
    await c.set('key2', 'value2');
    expect(await c.has('key2')).toBe(true);
  });

  test('delete removes key', async () => {
    const c = new MemoryCache();
    await c.set('key3', 'value3');
    await c.delete('key3');
    expect(await c.has('key3')).toBe(false);
  });

  test('returns undefined for missing key', async () => {
    const c = new MemoryCache();
    expect(await c.get('nonexistent')).toBeUndefined();
  });

  test('clear removes all entries', async () => {
    const c = new MemoryCache();
    await c.set('a', 1);
    await c.set('b', 2);
    await c.clear();
    expect(await c.has('a')).toBe(false);
    expect(await c.has('b')).toBe(false);
  });

  test('keys returns all stored keys', async () => {
    const c = new MemoryCache();
    await c.set('x', 10);
    await c.set('y', 20);
    await c.set('z', 30);
    const all = await c.keys();
    expect(all).toContain('x');
    expect(all).toContain('y');
    expect(all).toContain('z');
    expect(all.length).toBe(3);
  });

  test('TTL expiration', async () => {
    const c = new MemoryCache();
    await c.set('ephemeral', 'gone', -1);
    expect(await c.get('ephemeral')).toBeUndefined();
  });

  test('stats returns cache metrics', async () => {
    const c = new MemoryCache();
    await c.set('hitme', 'found');
    await c.get('hitme');
    await c.get('missme');
    const s = await c.stats();
    expect(s.hits).toBe(1);
    expect(s.misses).toBe(1);
    expect(s.size).toBe(1);
    expect(s.hitRate).toBe(0.5);
  });

  test('stores complex objects', async () => {
    const c = new MemoryCache();
    const obj = { name: 'test', values: [1, 2, 3], nested: { a: true } };
    await c.set('complex', obj);
    const result = await c.get<typeof obj>('complex');
    expect(result?.name).toBe('test');
    expect(result?.values).toEqual([1, 2, 3]);
    expect(result?.nested.a).toBe(true);
  });

  test('overwrite existing key', async () => {
    const c = new MemoryCache();
    await c.set('overwrite', 'old');
    await c.set('overwrite', 'new');
    expect(await c.get('overwrite')).toBe('new');
  });

  test('handles many entries', async () => {
    const c = new MemoryCache();
    const count = 1000;
    for (let i = 0; i < count; i++) {
      await c.set(`batch-${i}`, i);
    }
    expect((await c.keys()).length).toBe(count);
    expect(await c.get('batch-0')).toBe(0);
    expect(await c.get(`batch-${count - 1}`)).toBe(count - 1);
  });
});
