import { diffText, diffTexts } from '../src/text-diff';
import { deepDiff } from '../src/object-diff';

describe('diffText', () => {
  it('returns added and removed lines for different content', () => {
    const result = diffText('line1\nline2\nline3', 'line1\nchanged\nline3', 'test.txt');
    expect(result.linesAdded).toBe(1);
    expect(result.linesRemoved).toBe(1);
    expect(result.chunks.some(c => c.type === 'add')).toBe(true);
    expect(result.chunks.some(c => c.type === 'remove')).toBe(true);
    expect(result.file).toBe('test.txt');
  });

  it('with identical content returns empty changes (zero added/removed)', () => {
    const result = diffText('hello\nworld', 'hello\nworld', 'same.txt');
    expect(result.linesAdded).toBe(0);
    expect(result.linesRemoved).toBe(0);
    expect(result.chunks.every(c => c.type === 'context')).toBe(true);
  });

  it('handles empty strings', () => {
    const result = diffText('', '', 'empty.txt');
    expect(result.linesAdded).toBe(0);
    expect(result.linesRemoved).toBe(0);
    expect(result.file).toBe('empty.txt');
  });

  it('handles single-line input', () => {
    const result = diffText('old line', 'new line', 'single.txt');
    expect(result.linesAdded).toBe(1);
    expect(result.linesRemoved).toBe(1);
    expect(result.chunks.filter(c => c.type === 'add' || c.type === 'remove').length).toBeGreaterThanOrEqual(2);
  });

  it('handles new content being longer than old', () => {
    const result = diffText('a', 'a\nb\nc', 'longer.txt');
    expect(result.linesAdded).toBe(2);
    expect(result.linesRemoved).toBe(0);
  });

  it('handles old content being longer than new', () => {
    const result = diffText('a\nb\nc', 'a', 'shorter.txt');
    expect(result.linesAdded).toBe(0);
    expect(result.linesRemoved).toBe(2);
  });
});

describe('diffTexts', () => {
  it('diffs multiple files and returns summary', () => {
    const result = diffTexts([
      { path: 'a.ts', original: 'old', modified: 'new' },
      { path: 'b.ts', original: 'same', modified: 'same' },
    ]);
    expect(result.totalFiles).toBe(2);
    expect(result.totalAdded).toBeGreaterThanOrEqual(1);
    expect(result.totalRemoved).toBeGreaterThanOrEqual(1);
    expect(result.summary).toContain('files changed');
  });
});

describe('deepDiff', () => {
  it('detects changed primitive values', () => {
    const result = deepDiff({ a: 1, b: 2 }, { a: 1, b: 3 });
    expect(result.length).toBe(1);
    expect(result[0].type).toBe('non-breaking');
    expect(result[0].field).toBe('b');
  });

  it('returns empty array for identical objects', () => {
    const result = deepDiff({ a: 1 }, { a: 1 });
    expect(result.length).toBe(0);
  });

  it('detects added fields', () => {
    const result = deepDiff({}, { newField: 'value' });
    expect(result.length).toBe(1);
    expect(result[0].change).toBe('adicionado');
  });

  it('detects removed fields', () => {
    const result = deepDiff({ oldField: 'value' }, {});
    expect(result.length).toBe(1);
    expect(result[0].change).toBe('removido');
  });
});
