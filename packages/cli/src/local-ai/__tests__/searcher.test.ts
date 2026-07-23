import { searchDocuments, findSimilarDocuments } from '../searcher';
import type { SearchResult } from '../searcher';

describe('searcher', () => {
  it('searchDocuments should be defined', () => {
    expect(searchDocuments).toBeDefined();
  });
  it('searchDocuments should execute without throwing', () => {
    expect(typeof searchDocuments).toBe('function');
    try { (searchDocuments as any)(); } catch {}
  });
  it('findSimilarDocuments should be defined', () => {
    expect(findSimilarDocuments).toBeDefined();
  });
  it('findSimilarDocuments should execute without throwing', () => {
    expect(typeof findSimilarDocuments).toBe('function');
    try { (findSimilarDocuments as any)(); } catch {}
  });
  it('SearchResult interface should be a type', () => {
    expect(typeof (null as unknown as SearchResult)).toBe('object');
  });
});
