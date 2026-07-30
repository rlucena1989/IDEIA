import { DefaultSearchService } from './search';
import { SearchCache } from './search-cache';
import { SearchResult, SearchProvider } from './types';

describe('DefaultSearchService', () => {
  let service: DefaultSearchService;

  beforeEach(() => {
    service = new DefaultSearchService();
  });

  it('returns results from all providers', async () => {
    const provider1 = createMockProvider('p1', ['result1.ts:1:5:foo']);
    const provider2 = createMockProvider('p2', ['result2.ts:5:10:bar']);
    service.registerProvider(provider1);
    service.registerProvider(provider2);

    const results = await service.search('test');

    expect(results).toHaveLength(2);
    expect(results[0].uri).toBe('p1://result1.ts');
    expect(results[1].uri).toBe('p2://result2.ts');
  });

  it('runs providers in parallel and cancels mid-search', async () => {
    const provider1 = createMockProvider('p1', ['a.ts:1:5:x', 'b.ts:2:6:y']);
    const provider2 = createMockProvider('p2', ['c.ts:3:7:z']);
    const provider2Search = jest.spyOn(provider2, 'search');
    service.registerProvider(provider1);
    service.registerProvider(provider2);

    const searchPromise = service.search('test');
    service.cancel();
    const results = await searchPromise;

    expect(provider2Search).toHaveBeenCalled();
    expect(results).toHaveLength(0);
  });

  it('respects maxResults option', async () => {
    const provider = createMockProvider('p1', [
      'a.ts:1:5:one', 'b.ts:2:6:two', 'c.ts:3:7:three',
    ]);
    service.registerProvider(provider);

    const results = await service.search('test', { maxResults: 2 });

    expect(results).toHaveLength(2);
  });

  it('delegates replace to all providers with replace method', async () => {
    const providerA = createMockProvider('pA', []);
    const providerB = createMockProvider('pB', []);
    jest.spyOn(providerA, 'replace').mockResolvedValue({ replacements: 3, files: 2 });
    jest.spyOn(providerB, 'replace').mockResolvedValue({ replacements: 5, files: 4 });
    service.registerProvider(providerA);
    service.registerProvider(providerB);

    const result = await service.replace('foo', 'bar');

    expect(result).toEqual({ replacements: 8, files: 6 });
  });

  it('fires onSearchComplete after search finishes', async () => {
    const provider = createMockProvider('p1', ['a.ts:1:5:x']);
    service.registerProvider(provider);
    const completeSpy = jest.fn();
    service.onSearchComplete(completeSpy);

    await service.search('test');

    expect(completeSpy).toHaveBeenCalledTimes(1);
    expect(completeSpy).toHaveBeenCalledWith(expect.arrayContaining([
      expect.objectContaining({ uri: 'p1://a.ts' }),
    ]));
  });

  it('cancels replace operation mid-way', async () => {
    const providerA = createMockProvider('pA', []);
    const providerB = createMockProvider('pB', []);
    jest.spyOn(providerA, 'replace').mockResolvedValue({ replacements: 3, files: 2 });
    const providerBReplace = jest.spyOn(providerB, 'replace').mockResolvedValue({ replacements: 5, files: 4 });
    service.registerProvider(providerA);
    service.registerProvider(providerB);

    const replacePromise = service.replace('foo', 'bar');
    service.cancel();
    const result = await replacePromise;

    expect(providerBReplace).not.toHaveBeenCalled();
    expect(result).toEqual({ replacements: 3, files: 2 });
  });
});

describe('SearchCache', () => {
  let cache: SearchCache;

  beforeEach(() => {
    cache = new SearchCache(10, 100, 5000);
  });

  it('stores and retrieves cached results', () => {
    const results = [makeResult('file.ts', 1, 5, 'foo')];
    cache.set('test', results);
    expect(cache.get('test')).toEqual(results);
  });

  it('returns undefined for miss', () => {
    expect(cache.get('nonexistent')).toBeUndefined();
  });

  it('tracks hit rate correctly', () => {
    expect(cache.getHitRate()).toBe(0);
    cache.set('query1', [makeResult('a.ts', 1, 1, 'x')]);
    cache.get('query1');
    cache.get('query1');
    cache.get('missing');
    const rate = cache.getHitRate();
    expect(rate).toBeCloseTo(2 / 3);
  });

  it('tracks top searched terms', () => {
    cache.set('foo', [makeResult('a.ts', 1, 1, 'x')]);
    cache.set('bar', [makeResult('b.ts', 1, 1, 'y')]);
    cache.get('foo');
    cache.get('foo');
    cache.get('bar');

    const top = cache.getTopTerms(2);
    expect(top[0].term).toBe('foo');
    expect(top[0].count).toBe(2);
    expect(top[1].term).toBe('bar');
    expect(top[1].count).toBe(1);
  });

  it('invalidates entries for a specific provider', () => {
    cache.set('query1', [makeResult('provider1://file.ts', 1, 1, 'x')]);
    cache.set('query2', [makeResult('provider2://file.ts', 1, 1, 'y')]);

    cache.invalidateForProvider('provider1');

    expect(cache.get('query1')).toBeUndefined();
    expect(cache.get('query2')).toBeDefined();
  });

  it('invalidates all entries when no pattern given', () => {
    cache.set('a', [makeResult('a.ts', 1, 1, 'x')]);
    cache.set('b', [makeResult('b.ts', 1, 1, 'y')]);
    cache.invalidate();
    expect(cache.get('a')).toBeUndefined();
    expect(cache.get('b')).toBeUndefined();
  });

  it('evicts oldest entries when over capacity', () => {
    const smallCache = new SearchCache(2, 100, 5000);
    smallCache.set('a', [makeResult('a.ts', 1, 1, 'x')]);
    smallCache.set('b', [makeResult('b.ts', 1, 1, 'y')]);
    smallCache.get('b');
    smallCache.set('c', [makeResult('c.ts', 1, 1, 'z')]);

    expect(smallCache.get('a')).toBeUndefined();
    expect(smallCache.get('b')).toBeDefined();
    expect(smallCache.get('c')).toBeDefined();
  });

  it('preloads terms using fetch function', async () => {
    const fetchFn = jest.fn().mockImplementation(async (q: string) => [
      makeResult(`${q}.ts`, 1, 1, q),
    ]);

    await cache.preload(['foo', 'bar'], fetchFn);

    expect(fetchFn).toHaveBeenCalledTimes(2);
    const fooResult = cache.get('foo');
    expect(fooResult).toBeDefined();
    expect(fooResult?.[0].uri).toBe('foo.ts');
    const barResult = cache.get('bar');
    expect(barResult).toBeDefined();
    expect(barResult?.[0].uri).toBe('bar.ts');
  });

  it('preload skips already cached terms', async () => {
    cache.set('cached', [makeResult('cached.ts', 1, 1, 'x')]);
    const fetchFn = jest.fn().mockResolvedValue([makeResult('new.ts', 1, 1, 'y')]);

    await cache.preload(['cached', 'new'], fetchFn);

    expect(fetchFn).toHaveBeenCalledTimes(1);
    expect(fetchFn).toHaveBeenCalledWith('new');
  });

  it('expires entries after TTL', async () => {
    const shortCache = new SearchCache(10, 100, 10);
    shortCache.set('test', [makeResult('a.ts', 1, 1, 'x')]);
    expect(shortCache.get('test')).toBeDefined();

    await new Promise(r => setTimeout(r, 20));
    expect(shortCache.get('test')).toBeUndefined();
  });

  it('provides stats', () => {
    cache.set('q1', [makeResult('a.ts', 1, 1, 'x')]);
    cache.set('q2', [makeResult('b.ts', 1, 1, 'y')]);
    const stats = cache.getStats();
    expect(stats.entries).toBe(2);
    expect(stats.indexTerms).toBeGreaterThan(0);
  });
});

function createMockProvider(id: string, specs: string[]): SearchProvider {
  return makeProvider(id, specs);
}

function makeProvider(id: string, specs: string[]) {
  const items: SearchResult[] = specs.map((spec) => {
    const parts = spec.split(':');
    return {
      uri: `${id}://${parts[0]}`,
      line: parseInt(parts[1]),
      column: parseInt(parts[2]),
      lineContent: parts[3] ?? '',
      matchText: parts[3] ?? '',
      matchLength: (parts[3] ?? '').length,
    };
  });
  const provider: SearchProvider = {
    id,
    async *search(_query: string, _options?: unknown): AsyncIterable<SearchResult> {
      for (const item of items) {
        yield item;
      }
    },
    replace: jest.fn().mockResolvedValue({ replacements: 0, files: 0 }),
  };
  return provider;
}

function makeResult(uri: string, line: number, column: number, text: string): SearchResult {
  return {
    uri,
    line,
    column,
    lineContent: text,
    matchText: text,
    matchLength: text.length,
  };
}
