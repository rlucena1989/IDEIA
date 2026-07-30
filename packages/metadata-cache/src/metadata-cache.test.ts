import { MetadataCache } from './metadata-cache';
import type { CacheLayer } from '@ideia/cache';
import type { MetadataEntry } from './types';

function createMockCacheLayer(): CacheLayer {
  const store = new Map<string, unknown>();
  const get = jest.fn();
  get.mockImplementation((key: string) => Promise.resolve(store.get(key)));
  return {
    get,
    set: jest.fn(async (key: string, value: unknown) => { store.set(key, value); }),
    delete: jest.fn(async (key: string) => store.delete(key)),
    has: jest.fn(async (key: string) => store.has(key)),
    clear: jest.fn(async () => store.clear()),
    stats: jest.fn().mockResolvedValue({ size: 0, hits: 0, misses: 0, evictions: 0, hitRate: 0 }),
    keys: jest.fn(async () => [...store.keys()]),
  } as unknown as CacheLayer;
}

function makeEntry(path: string, overrides?: Partial<MetadataEntry>): MetadataEntry {
  return {
    path,
    tags: [],
    links: [],
    backlinks: [],
    headings: [],
    wordCount: 0,
    lastModified: Date.now(),
    metadata: {},
    ...overrides,
  };
}

describe('MetadataCache', () => {
  let cache: CacheLayer;
  let metadataCache: MetadataCache;

  beforeEach(() => {
    cache = createMockCacheLayer();
    metadataCache = new MetadataCache(cache);
  });

  it('should store and retrieve an entry', async () => {
    const entry = makeEntry('doc1.md', { title: 'Document 1', tags: ['alpha'] });
    await metadataCache.set('doc1.md', entry);
    const result = await metadataCache.get('doc1.md');
    expect(result).toEqual(entry);
  });

  it('should return undefined for a missing entry', async () => {
    const result = await metadataCache.get('nonexistent.md');
    expect(result).toBeUndefined();
  });

  it('should delete an entry', async () => {
    const entry = makeEntry('doc1.md');
    await metadataCache.set('doc1.md', entry);
    await metadataCache.delete('doc1.md');
    const result = await metadataCache.get('doc1.md');
    expect(result).toBeUndefined();
  });

  it('should clear all entries', async () => {
    await metadataCache.set('a.md', makeEntry('a.md'));
    await metadataCache.set('b.md', makeEntry('b.md'));
    await metadataCache.clear();
    expect(await metadataCache.get('a.md')).toBeUndefined();
    expect(await metadataCache.get('b.md')).toBeUndefined();
  });

  it('should evict oldest entry when maxEntries is exceeded', async () => {
    const orderedCache = new Map<string, unknown>();
    const get = jest.fn();
    get.mockImplementation((key: string) => Promise.resolve(orderedCache.get(key)));
    const mockCache = {
      get,
      set: jest.fn(async (k: string, v: unknown) => { orderedCache.set(k, v); }),
      delete: jest.fn(async (k: string) => orderedCache.delete(k)),
      has: jest.fn(async (k: string) => orderedCache.has(k)),
      clear: jest.fn(async () => orderedCache.clear()),
      stats: jest.fn().mockResolvedValue({ size: 0, hits: 0, misses: 0, evictions: 0, hitRate: 0 }),
      keys: jest.fn(async () => [...orderedCache.keys()]),
    } as unknown as CacheLayer;
    const mc = new MetadataCache(mockCache, { maxEntries: 2 });

    await mc.set('old.md', makeEntry('old.md', { lastModified: 100 }));
    await mc.set('mid.md', makeEntry('mid.md', { lastModified: 200 }));
    await mc.set('new.md', makeEntry('new.md', { lastModified: 300 }));

    expect((mockCache as unknown as { delete: jest.Mock }).delete).toHaveBeenCalledWith('old.md');
  });

  it('should search entries by path substring', async () => {
    await metadataCache.set('alpha.md', makeEntry('alpha.md', { title: 'Alpha' }));
    await metadataCache.set('beta.md', makeEntry('beta.md', { title: 'Beta' }));
    const results = await metadataCache.search('alpha');
    expect(results).toHaveLength(1);
    expect(results[0].path).toBe('alpha.md');
  });

  it('should search entries by title substring', async () => {
    await metadataCache.set('a.md', makeEntry('a.md', { title: 'Important Doc' }));
    await metadataCache.set('b.md', makeEntry('b.md', { title: 'Other' }));
    const results = await metadataCache.search('important');
    expect(results).toHaveLength(1);
    expect(results[0].path).toBe('a.md');
  });

  it('should search entries by tag', async () => {
    await metadataCache.set('a.md', makeEntry('a.md', { tags: ['javascript'] }));
    await metadataCache.set('b.md', makeEntry('b.md', { tags: ['typescript'] }));
    const results = await metadataCache.search('script');
    expect(results).toHaveLength(2);
  });

  it('should get entries by exact tag', async () => {
    await metadataCache.set('a.md', makeEntry('a.md', { tags: ['js'] }));
    await metadataCache.set('b.md', makeEntry('b.md', { tags: ['js'] }));
    await metadataCache.set('c.md', makeEntry('c.md', { tags: ['ts'] }));
    const results = await metadataCache.getByTag('JS');
    expect(results).toHaveLength(2);
  });

  it('should compute stats correctly', async () => {
    await metadataCache.set('a.md', makeEntry('a.md', { tags: ['x'], backlinks: ['b.md'] }));
    await metadataCache.set('b.md', makeEntry('b.md', { tags: ['y'], backlinks: [] }));
    const stats = await metadataCache.stats();
    expect(stats.entries).toBe(2);
    expect(stats.tags).toBe(2);
    expect(stats.backlinks).toBe(1);
    expect(stats.lastIndexed).toBeDefined();
  });

  it('should return empty array when searching empty cache', async () => {
    const results = await metadataCache.search('anything');
    expect(results).toEqual([]);
  });
});
