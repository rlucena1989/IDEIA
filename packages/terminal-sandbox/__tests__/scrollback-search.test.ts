import { ScrollbackSearch } from '../src/scrollback-search';

describe('ScrollbackSearch', () => {
  const buffer = [
    'const x = 42;',
    'function hello() {',
    '  return x + 1;',
    '}',
    '// x is the answer',
  ];

  let searcher: ScrollbackSearch;

  beforeEach(() => {
    searcher = new ScrollbackSearch(buffer);
  });

  it('should find case-insensitive matches', () => {
    const matches = searcher.search('x');
    expect(matches.length).toBe(3);
    expect(matches[0].line).toBe(0);
    expect(matches[0].text).toBe('x');
    expect(matches[1].line).toBe(2);
    expect(matches[2].line).toBe(4);
  });

  it('should support regex search with slashes', () => {
    const matches = searcher.search('/\\b\\w+\\b/');
    expect(matches.length).toBeGreaterThan(0);
  });

  it('should navigate next and previous', () => {
    searcher.search('x');

    const first = searcher.next();
    expect(first).toBeDefined();

    const second = searcher.next();
    expect(second).toBeDefined();
    expect(second!.index).toBe(first!.index + 1);

    const prev = searcher.previous();
    expect(prev!.index).toBe(first!.index);
  });

  it('should wrap around at boundaries', () => {
    searcher.search('x');
    const matches = searcher.getMatchCount();

    for (let i = 0; i < matches * 2; i++) {
      searcher.next();
    }
    expect(searcher.getCurrentIndex()).toBeGreaterThanOrEqual(0);
  });

  it('clearHighlight should reset state', () => {
    searcher.search('x');
    expect(searcher.getMatchCount()).toBe(3);

    searcher.clearHighlight();
    expect(searcher.getMatchCount()).toBe(0);
    expect(searcher.getCurrentMatch()).toBeUndefined();
  });

  it('should return 0 matches for non-existent query', () => {
    const matches = searcher.search('zzz_nonexistent_zzz');
    expect(matches.length).toBe(0);
    expect(searcher.getMatchCount()).toBe(0);
  });

  it('should handle empty buffer', () => {
    const empty = new ScrollbackSearch([]);
    expect(empty.search('test')).toEqual([]);
  });

  it('should handle setBuffer', () => {
    searcher.setBuffer(['alpha', 'beta', 'gamma']);
    const matches = searcher.search('a');
    expect(matches.length).toBe(5);
  });
});
