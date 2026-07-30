import { TagIndex } from './tag-index';
import type { MetadataEntry } from './types';

function entry(path: string, tags: string[]): MetadataEntry {
  return {
    path,
    tags,
    links: [],
    backlinks: [],
    headings: [],
    wordCount: 0,
    lastModified: 0,
    metadata: {},
  };
}

describe('TagIndex', () => {
  let tagIndex: TagIndex;

  beforeEach(() => {
    tagIndex = new TagIndex();
  });

  it('should index entries and return tag groups sorted by count desc', () => {
    tagIndex.index([
      entry('a.md', ['js', 'node']),
      entry('b.md', ['js', 'react']),
      entry('c.md', ['node']),
    ]);
    const groups = tagIndex.getTagGroups();
    expect(groups).toHaveLength(3);
    expect(groups[0].tag).toBe('js');
    expect(groups[0].count).toBe(2);
    expect(groups[1].tag).toBe('node');
    expect(groups[1].count).toBe(2);
    expect(groups[2].tag).toBe('react');
    expect(groups[2].count).toBe(1);
  });

  it('should return files by tag (case-insensitive)', () => {
    tagIndex.index([
      entry('a.md', ['TypeScript']),
      entry('b.md', ['typescript']),
    ]);
    const files = tagIndex.getFilesByTag('TYPESCRIPT');
    expect(files).toHaveLength(2);
    expect(files).toContain('a.md');
    expect(files).toContain('b.md');
  });

  it('should return empty array for non-existent tag', () => {
    tagIndex.index([entry('a.md', ['js'])]);
    expect(tagIndex.getFilesByTag('rust')).toEqual([]);
  });

  it('should return related tags (co-occurrence)', () => {
    tagIndex.index([
      entry('a.md', ['js', 'node', 'express']),
      entry('b.md', ['js', 'node']),
      entry('c.md', ['js', 'react']),
    ]);
    const related = tagIndex.getRelatedTags('js');
    expect(related).toHaveLength(3);
    expect(related.find(r => r.tag === 'node')!.count).toBe(2);
    expect(related.find(r => r.tag === 'express')!.count).toBe(1);
    expect(related.find(r => r.tag === 'react')!.count).toBe(1);
  });

  it('should return empty related tags when tag does not exist', () => {
    tagIndex.index([entry('a.md', ['js'])]);
    expect(tagIndex.getRelatedTags('nonexistent')).toEqual([]);
  });

  it('should search tags by partial query', () => {
    tagIndex.index([
      entry('a.md', ['typescript']),
      entry('b.md', ['javascript']),
      entry('c.md', ['java']),
    ]);
    const results = tagIndex.searchTags('script');
    expect(results).toHaveLength(2);
    expect(results.find(r => r.tag === 'typescript')).toBeDefined();
    expect(results.find(r => r.tag === 'javascript')).toBeDefined();
  });

  it('should handle empty entries gracefully', () => {
    tagIndex.index([]);
    expect(tagIndex.getTagGroups()).toEqual([]);
    expect(tagIndex.getFilesByTag('anything')).toEqual([]);
    expect(tagIndex.getRelatedTags('anything')).toEqual([]);
    expect(tagIndex.searchTags('anything')).toEqual([]);
  });

  it('should normalize tags (trim + lowercase)', () => {
    tagIndex.index([
      entry('a.md', ['  JS ']),
      entry('b.md', [' js ']),
    ]);
    expect(tagIndex.getFilesByTag('js')).toHaveLength(2);
  });

  it('should replace index on re-index', () => {
    tagIndex.index([entry('a.md', ['js'])]);
    tagIndex.index([entry('b.md', ['rust'])]);
    expect(tagIndex.getFilesByTag('js')).toEqual([]);
    expect(tagIndex.getFilesByTag('rust')).toHaveLength(1);
  });
});
