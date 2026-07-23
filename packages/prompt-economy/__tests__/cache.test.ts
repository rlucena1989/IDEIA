import { LLMCache } from '../src/cache/llm-cache';

describe('LLMCache', () => {
  const cache = new LLMCache({ maxEntries: 100 });

  it('stores and retrieves values', () => {
    cache.set('test-key', { result: 'ok' });
    const hit = cache.get('test-key');
    expect(hit.found).toBe(true);
    expect(hit.value).toEqual({ result: 'ok' });
  });

  it('returns not found for missing keys', () => {
    const hit = cache.get('non-existent');
    expect(hit.found).toBe(false);
  });

  it('respects TTL', () => {
    cache.set('ttl-key-expired', 'value', -1);
    const hit = cache.get('ttl-key-expired');
    expect(hit.found).toBe(false);
  });

  it('invalidates specific keys', () => {
    cache.set('to-delete', 'value');
    cache.invalidate('to-delete');
    expect(cache.get('to-delete').found).toBe(false);
  });

  it('invalidates by prefix', () => {
    cache.set('plan:abc', 'plan1');
    cache.set('plan:def', 'plan2');
    cache.set('decision:xyz', 'decision1');
    cache.invalidateByPrefix('plan:');
    expect(cache.get('plan:abc').found).toBe(false);
    expect(cache.get('plan:def').found).toBe(false);
    expect(cache.get('decision:xyz').found).toBe(true);
  });

  it('generates consistent keys', () => {
    const key1 = cache.makeKey('plan', 'create login', 'feature');
    const key2 = cache.makeKey('plan', 'create login', 'feature');
    expect(key1).toBe(key2);
  });

  it('evicts LRU when full', () => {
    const small = new LLMCache({ maxEntries: 3 });
    small.set('a', 1);
    small.set('b', 2);
    small.set('c', 3);
    small.set('d', 4);
    expect(small.size()).toBe(3);
    expect(small.get('a').found).toBe(false);
  });
});
