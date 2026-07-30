import { buildMemoryIndex } from '../memory-index';
import type { MemoryRecord } from '@ideia/contracts';

describe('buildMemoryIndex', () => {
  const makeRecord = (tags: string[], id?: string): MemoryRecord => ({
    memoryId: id ?? `mem-${Math.random()}`,
    category: 'cycle',
    source: 'test',
    summary: 'test',
    tags,
    createdAt: new Date().toISOString(),
  });

  it('returns empty object for no records', () => {
    const index = buildMemoryIndex([]);
    expect(index).toEqual({});
  });

  it('indexes tags from single record', () => {
    const records = [makeRecord(['tag1', 'tag2'])];
    const index = buildMemoryIndex(records);
    expect(index).toEqual({ tag1: 1, tag2: 1 });
  });

  it('counts tag frequency across records', () => {
    const records = [
      makeRecord(['common', 'a']),
      makeRecord(['common', 'b']),
      makeRecord(['common', 'common']),
    ];
    const index = buildMemoryIndex(records);
    expect(index.common).toBe(4);
    expect(index.a).toBe(1);
    expect(index.b).toBe(1);
  });

  it('handles records with empty tags array', () => {
    const records = [makeRecord([])];
    const index = buildMemoryIndex(records);
    expect(index).toEqual({});
  });

  it('is case-sensitive for tags', () => {
    const records = [makeRecord(['Tag', 'tag'])];
    const index = buildMemoryIndex(records);
    expect(index.Tag).toBe(1);
    expect(index.tag).toBe(1);
  });
});
