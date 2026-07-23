import { diffText, diffTexts } from '../text-diff';
import { deepDiff } from '../object-diff';
import { detectEquivalence } from '../semantic-diff';

describe('text-diff', () => {
  it('should detect no changes', () => {
    const result = diffText('hello\nworld', 'hello\nworld', 'test.txt');
    expect(result.linesAdded).toBe(0);
    expect(result.linesRemoved).toBe(0);
    expect(result.chunks.length).toBeGreaterThan(0);
  });

  it('should detect added lines', () => {
    const result = diffText('hello', 'hello\nworld', 'test.txt');
    expect(result.linesAdded).toBe(1);
    expect(result.linesRemoved).toBe(0);
  });

  it('should detect removed lines', () => {
    const result = diffText('hello\nworld', 'hello', 'test.txt');
    expect(result.linesAdded).toBe(0);
    expect(result.linesRemoved).toBe(1);
  });

  it('should diff multiple files', () => {
    const result = diffTexts([
      { path: 'a.ts', original: 'a', modified: 'b' },
      { path: 'b.ts', original: 'x', modified: 'x' },
    ]);
    expect(result.totalFiles).toBe(2);
    expect(result.totalAdded).toBeGreaterThanOrEqual(0);
  });
});

describe('object-diff', () => {
  it('should detect changed values', () => {
    const result = deepDiff({ a: 1, b: 2 }, { a: 1, b: 3 });
    expect(result.length).toBeGreaterThan(0);
    expect(result[0]!.type).toBe('non-breaking');
    expect(result[0]!.field).toBe('b');
  });

  it('should report unchanged objects', () => {
    const result = deepDiff({ a: 1 }, { a: 1 });
    expect(result.length).toBe(0);
  });
});

describe('semantic-diff', () => {
  it('should detect equivalent code', () => {
    const result = detectEquivalence('const x = 1', 'const x = 1');
    expect(result.equivalent).toBe(true);
  });
});
