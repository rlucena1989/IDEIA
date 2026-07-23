import { VectorSearch, cosineSimilarity, normalizeVector, createVectorSearch } from '../src/vector-search';

const DIMS = 4;
function v(...vals: number[]): number[] {
  const arr = new Array(DIMS).fill(0);
  for (let i = 0; i < Math.min(vals.length, DIMS); i++) arr[i] = vals[i];
  return arr;
}

describe('cosineSimilarity', () => {
  it('identical', () => expect(cosineSimilarity(v(1,0,0,0), v(1,0,0,0))).toBeCloseTo(1));
  it('orthogonal', () => expect(cosineSimilarity(v(1,0,0,0), v(0,1,0,0))).toBeCloseTo(0));
  it('opposite', () => expect(cosineSimilarity(v(1,0,0,0), v(-1,0,0,0))).toBeCloseTo(-1));
  it('zero', () => expect(cosineSimilarity(v(0,0,0,0), v(1,0,0,0))).toBe(0));
});

describe('normalizeVector', () => {
  it('unit length', () => {
    const n = normalizeVector([3, 0, 0, 4]);
    expect(n[0]).toBeCloseTo(0.6);
    expect(n[3]).toBeCloseTo(0.8);
  });
  it('zero', () => expect(normalizeVector([0, 0, 0, 0])).toEqual([0, 0, 0, 0]));
});

describe('VectorSearch', () => {
  let vs: VectorSearch;
  beforeEach(() => { vs = new VectorSearch(DIMS); });

  it('starts empty', () => expect(vs.size).toBe(0));

  it('adds records', () => {
    vs.add('test', { cat: 'a' }, v(0.1));
    expect(vs.size).toBe(1);
  });

  it('searches by similarity', () => {
    vs.add('apple', { cat: 'fruit' }, v(1, 0));
    vs.add('orange', { cat: 'fruit' }, v(0.9, 0.1));
    vs.add('engine', { cat: 'car' }, v(0, 0, 1));
    const results = vs.search(v(1, 0, 0), 3);
    expect(results[0]!.record.content).toBe('apple');
    expect(results[1]!.record.content).toBe('orange');
  });

  it('filters by metadata', () => {
    vs.add('review a', { cat: 'review' }, v(0.5));
    vs.add('review b', { cat: 'review' }, v(0.5));
    vs.add('feature', { cat: 'feature' }, v(0.5));
    expect(vs.search(v(0.5), 10, { filter: m => m.cat === 'review' })).toHaveLength(2);
  });

  it('minScore threshold', () => {
    vs.add('match', { cat: 'x' }, v(1, 0));
    vs.add('noise', { cat: 'x' }, v(0, 1));
    expect(vs.search(v(1, 0), 10, { minScore: 0.5 }).length).toBe(1);
  });

  it('get by id', () => {
    const doc = vs.add('test', {}, v(0.1));
    expect(vs.get(doc.id)).toBeDefined();
  });

  it('delete', () => {
    const doc = vs.add('test', {}, v(0.1));
    vs.delete(doc.id);
    expect(vs.size).toBe(0);
  });

  it('clear', () => {
    vs.add('a', {}, v(0.1));
    vs.add('b', {}, v(0.1));
    vs.clear();
    expect(vs.size).toBe(0);
  });

  it('createVectorSearch factory', () => {
    expect(createVectorSearch(4)).toBeInstanceOf(VectorSearch);
  });
});
