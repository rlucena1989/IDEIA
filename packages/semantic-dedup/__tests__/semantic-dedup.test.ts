import { SemanticDedupEngine, ContentItem, DedupResult } from '../src/semantic-dedup';
import { SessionMerger } from '../src/session-merger';

describe('SemanticDedupEngine', () => {
  let engine: SemanticDedupEngine;

  beforeEach(() => {
    engine = new SemanticDedupEngine({ similarityThreshold: 0.5 });
  });

  it('should add item with no duplicate', () => {
    const item: ContentItem = {
      id: '1', content: 'unique content here', session: 's1',
      timestamp: Date.now(), source: 'test',
    };
    const result = engine.addItem(item);
    expect(result).toBeNull();
    expect(engine.getStats().totalItems).toBe(1);
  });

  it('should find duplicate above threshold', () => {
    const item1: ContentItem = {
      id: '1', content: 'hello world foo bar', session: 's1',
      timestamp: Date.now(), source: 'test',
      embedding: [1, 0, 0],
    };
    const item2: ContentItem = {
      id: '2', content: 'hello world foo bar baz', session: 's1',
      timestamp: Date.now(), source: 'test',
      embedding: [0.9, 0.1, 0],
    };
    engine.addItem(item1);
    const result = engine.addItem(item2);
    expect(result).not.toBeNull();
    expect(result!.duplicates.length).toBeGreaterThan(0);
  });

  it('should findDuplicates return results', () => {
    engine.addItem({
      id: '1', content: 'the quick brown fox', session: 's1',
      timestamp: Date.now(), source: 'test',
    });
    const results = engine.findDuplicates('the quick brown fox');
    expect(results.length).toBeGreaterThan(0);
  });

  it('should getSimilarity return 1 for identical', () => {
    engine.addItem({
      id: 'a', content: 'same text', session: 's1',
      timestamp: Date.now(), source: 'test',
    });
    engine.addItem({
      id: 'b', content: 'same text', session: 's1',
      timestamp: Date.now(), source: 'test',
    });
    const sim = engine.getSimilarity('a', 'b');
    expect(sim).toBeGreaterThan(0.99);
  });

  it('should getSimilarity return lower for different', () => {
    engine.addItem({
      id: 'a', content: 'abcdefghij', session: 's1',
      timestamp: Date.now(), source: 'test',
    });
    engine.addItem({
      id: 'b', content: 'klmnopqrst', session: 's1',
      timestamp: Date.now(), source: 'test',
    });
    const sim = engine.getSimilarity('a', 'b');
    expect(sim).toBeLessThan(0.5);
  });

  it('should crossSessionDedup return results', () => {
    engine = new SemanticDedupEngine({ enableCrossSession: true, similarityThreshold: 0.5 });
    engine.addItem({
      id: '1', content: 'common topic discussion', session: 'session-a',
      timestamp: Date.now(), source: 'test',
    });
    engine.addItem({
      id: '2', content: 'common topic discussion extended', session: 'session-b',
      timestamp: Date.now(), source: 'test',
    });
    const result = engine.crossSessionDedup(['session-a', 'session-b']);
    expect(result.size).toBeGreaterThan(0);
  });

  it('should purgeExpired remove old items', () => {
    engine.addItem({
      id: 'old', content: 'old content', session: 's1',
      timestamp: Date.now() - 100 * 24 * 60 * 60 * 1000,
      source: 'test',
    });
    engine.addItem({
      id: 'new', content: 'new content', session: 's1',
      timestamp: Date.now(), source: 'test',
    });
    const removed = engine.purgeExpired();
    expect(removed).toBe(1);
    expect(engine.getStats().totalItems).toBe(1);
  });

  it('should getStats return counts', () => {
    engine.addItem({
      id: '1', content: 'stats test one', session: 's1',
      timestamp: Date.now(), source: 'test',
    });
    engine.addItem({
      id: '2', content: 'stats test two', session: 's1',
      timestamp: Date.now(), source: 'test',
    });
    const stats = engine.getStats();
    expect(stats.totalItems).toBe(2);
    expect(stats.sessionsCount).toBe(1);
  });
});

describe('SessionMerger', () => {
  let merger: SessionMerger;

  beforeEach(() => {
    merger = new SessionMerger();
  });

  it('should merge with latest-wins strategy', () => {
    const dupResult: DedupResult = {
      original: { id: '1', content: 'older version', session: 's1', timestamp: 1000, source: 'src1' },
      duplicates: [{ id: '2', content: 'newer version', session: 's1', timestamp: 2000, source: 'src2' }],
      similarityScores: [0.9],
      action: 'merge',
    };
    const merged = merger.merge([dupResult], { type: 'latest-wins' });
    expect(merged.content).toBe('newer version');
    expect(merged.mergedFrom).toContain('1');
    expect(merged.mergedFrom).toContain('2');
  });

  it('should merge with most-complete strategy', () => {
    const dupResult: DedupResult = {
      original: { id: '1', content: 'short', session: 's1', timestamp: 1000, source: 'src1' },
      duplicates: [{ id: '2', content: 'longer content here', session: 's1', timestamp: 2000, source: 'src2' }],
      similarityScores: [0.8],
      action: 'merge',
    };
    const merged = merger.merge([dupResult], { type: 'most-complete' });
    expect(merged.content).toBe('longer content here');
  });

  it('should detectConflicts between items', () => {
    const items: ContentItem[] = [
      { id: '1', content: 'content a', session: 's1', timestamp: 1000, source: 'src1' },
      { id: '2', content: 'content b', session: 's2', timestamp: 2000, source: 'src2' },
    ];
    const conflicts = merger.detectConflicts(items);
    const sessionConflict = conflicts.find(c => c.field === 'session');
    const sourceConflict = conflicts.find(c => c.field === 'source');
    const contentConflict = conflicts.find(c => c.field === 'content');
    expect(sessionConflict).toBeDefined();
    expect(sessionConflict!.values).toContain('s1');
    expect(sessionConflict!.values).toContain('s2');
    expect(sourceConflict).toBeDefined();
    expect(sourceConflict!.values).toContain('src1');
    expect(sourceConflict!.values).toContain('src2');
    expect(contentConflict).toBeDefined();
    expect(contentConflict!.values).toContain('content a');
    expect(contentConflict!.values).toContain('content b');
  });

  it('should autoResolve conflicts', () => {
    const conflicts = [
      { field: 'content', values: ['version1', 'version2'] },
      { field: 'source', values: ['srcA', 'srcB'] },
    ];
    const resolved = merger.autoResolve(conflicts, { type: 'latest-wins' });
    expect(resolved.content).toBe('version2');
    expect(resolved.source).toBe('srcB');
  });
});
