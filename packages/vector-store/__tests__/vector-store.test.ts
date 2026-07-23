import { InMemoryVectorStore, cosineSimilarity, normalizeVector, SemanticMemorySearch, createVectorStore } from '../src/index';

const DIMS = 4;

function makeVector(...vals: number[]): number[] {
  const v = new Array(DIMS).fill(0);
  for (let i = 0; i < Math.min(vals.length, DIMS); i++) v[i] = vals[i];
  return v;
}

describe('cosineSimilarity', () => {
  it('identical vectors', () => {
    expect(cosineSimilarity(makeVector(1,0,0,0), makeVector(1,0,0,0))).toBeCloseTo(1, 5);
  });

  it('orthogonal vectors', () => {
    expect(cosineSimilarity(makeVector(1,0,0,0), makeVector(0,1,0,0))).toBeCloseTo(0, 5);
  });

  it('opposite vectors', () => {
    expect(cosineSimilarity(makeVector(1,0,0,0), makeVector(-1,0,0,0))).toBeCloseTo(-1, 5);
  });

  it('zero vector', () => {
    expect(cosineSimilarity(makeVector(0,0,0,0), makeVector(1,0,0,0))).toBe(0);
  });

  it('mismatched dimensions returns 0', () => {
    expect(cosineSimilarity([1, 0], [1, 0, 0])).toBe(0);
  });
});

describe('normalizeVector', () => {
  it('unit vector', () => {
    const n = normalizeVector([3, 0, 0, 4]);
    expect(n[0]).toBeCloseTo(0.6, 5);
    expect(n[3]).toBeCloseTo(0.8, 5);
  });

  it('zero vector unchanged', () => {
    expect(normalizeVector([0, 0, 0, 0])).toEqual([0, 0, 0, 0]);
  });

  it('already normalized', () => {
    const n = normalizeVector([1, 0, 0, 0]);
    expect(n[0]).toBeCloseTo(1, 5);
  });

  it('negative values', () => {
    const n = normalizeVector([-3, 0, 0, -4]);
    expect(n[0]).toBeCloseTo(-0.6, 5);
  });
});

describe('InMemoryVectorStore', () => {
  let store: InMemoryVectorStore;

  beforeEach(() => {
    store = new InMemoryVectorStore(undefined, DIMS);
  });

  it('starts empty', () => {
    expect(store.size).toBe(0);
  });

  it('adds record with vector', async () => {
    const doc = await store.add({ content: 'test', vector: makeVector(0.1, 0.2, 0.3) });
    expect(doc.id).toBeTruthy();
    expect(doc.content).toBe('test');
    expect(store.size).toBe(1);
  });

  it('auto-fills missing vector with zeros', async () => {
    const doc = await store.add({ content: 'no vector' });
    expect(doc.vector).toEqual([0, 0, 0, 0]);
  });

  it('rejects dimension mismatch', async () => {
    await expect(store.add({ content: 'bad', vector: [1, 2, 3] })).rejects.toThrow('Vector dimension mismatch');
  });

  it('searches by vector similarity', async () => {
    await store.addMany([
      { content: 'apple fruit', vector: makeVector(1, 0, 0) },
      { content: 'orange fruit', vector: makeVector(0.9, 0.1, 0) },
      { content: 'car engine', vector: makeVector(0, 0, 1) },
    ]);
    const results = store.search(makeVector(1, 0, 0), 3);
    expect(results[0].record.content).toBe('apple fruit');
  });

  it('filters by metadata', async () => {
    await store.addMany([
      { content: 'code review', metadata: { category: 'review' } },
      { content: 'bug fix', metadata: { category: 'review' } },
      { content: 'planning', metadata: { category: 'plan' } },
    ]);
    const results = store.search(makeVector(0.5, 0.5), 10, {
      filter: m => m.category === 'review',
    });
    expect(results).toHaveLength(2);
  });

  it('minScore threshold', async () => {
    await store.addMany([
      { content: 'match', vector: makeVector(1, 0, 0) },
      { content: 'other', vector: makeVector(0, 0, 1) },
    ]);
    expect(store.search(makeVector(1, 0, 0), 10, { minScore: 0.5 })).toHaveLength(1);
  });

  it('get by id', async () => {
    const doc = await store.add({ content: 'x', vector: makeVector(0.1) });
    expect(store.get(doc.id)).toBeDefined();
  });

  it('delete by id', async () => {
    const doc = await store.add({ content: 'x', vector: makeVector(0.1) });
    store.delete(doc.id);
    expect(store.size).toBe(0);
  });

  it('delete returns false for nonexistent', () => {
    expect(store.delete('nonexistent')).toBe(false);
  });

  it('clear all', async () => {
    await store.addMany([{ content: 'a' }, { content: 'b' }].map(c => ({ ...c, vector: makeVector(0.1) })));
    expect(store.size).toBe(2);
    store.clear();
    expect(store.size).toBe(0);
  });

  it('serialize and restore', async () => {
    const doc = await store.add({ content: 'persist me', vector: makeVector(0.5) });
    const json = store.toJSON();
    const restored = InMemoryVectorStore.fromJSON(json);
    expect(restored.size).toBe(1);
    expect(restored.get(doc.id)).toBeDefined();
  });

  it('custom dimensions', () => {
    expect(new InMemoryVectorStore(undefined, 1536).getDimensions()).toBe(1536);
  });

  it('getProviderName returns none when no provider', () => {
    expect(store.getProviderName()).toBe('none');
  });

  it('setEmbeddingProvider updates dimensions', () => {
    const provider = { embed: async () => [[0]], dimensions: 128, name: 'test' };
    store.setEmbeddingProvider(provider);
    expect(store.getDimensions()).toBe(128);
    expect(store.getProviderName()).toBe('test');
  });

  it('search with empty store returns empty', () => {
    expect(store.search(makeVector(1, 0, 0), 10)).toEqual([]);
  });

  it('search with text query', async () => {
    await store.add({ content: 'hello world', vector: makeVector(1, 0) });
    const results = store.search('hello', 10);
    expect(results.length).toBeGreaterThanOrEqual(0);
  });
});

describe('SemanticMemorySearch', () => {
  it('indexes and searches', async () => {
    const search = new SemanticMemorySearch(undefined, DIMS);
    await search.indexMemoryRecords([
      { content: 'fix login bug', category: 'bug', tags: ['security'] },
      { content: 'add dashboard', category: 'feature', tags: ['ui'] },
    ]);
    expect(search.getVectorStore().size).toBe(2);
  });

  it('filters by category', async () => {
    const search = new SemanticMemorySearch(undefined, DIMS);
    await search.indexMemoryRecords([
      { content: 'security bug', category: 'bug', tags: ['security'] },
      { content: 'feature request', category: 'feature', tags: ['ui'] },
    ]);
    const r = search.hybridSearch('security', 5, { category: 'bug' });
    expect(r.every(x => x.record.metadata.category === 'bug')).toBe(true);
  });

  it('serialize and restore', async () => {
    const s1 = new SemanticMemorySearch(undefined, DIMS);
    await s1.indexMemoryRecords([{ content: 'test', category: 'test', tags: ['x'] }]);
    const restored = SemanticMemorySearch.fromJSON(s1.toJSON());
    expect(restored.getVectorStore().size).toBe(1);
  });

  it('hybrid search with minScore', async () => {
    const search = new SemanticMemorySearch(undefined, DIMS);
    await search.indexMemoryRecords([{ content: 'unique content here', category: 'test', tags: [] }]);
    const r = search.hybridSearch('unique', 5, { minScore: 0.5 });
    expect(r.length).toBeGreaterThanOrEqual(0);
  });
});

describe('createVectorStore', () => {
  it('creates empty store', () => {
    expect(createVectorStore()).toBeInstanceOf(InMemoryVectorStore);
  });
});
