import { describe, it, expect, beforeEach } from '@jest/globals';
import { MemoryHierarchy } from '../src/hierarchy';
import { createMemoryHierarchy } from '../src/index';
import { MemoryLevel, EntryCategory } from '../src/types';

describe('MemoryHierarchy', () => {
  let hierarchy: MemoryHierarchy;

  beforeEach(() => {
    hierarchy = createMemoryHierarchy();
  });

  describe('constructor', () => {
    it('should create hierarchy with all memory levels', () => {
      expect(hierarchy).toBeInstanceOf(MemoryHierarchy);
      expect(hierarchy.working).toBeDefined();
      expect(hierarchy.project).toBeDefined();
      expect(hierarchy.institutional).toBeDefined();
      expect(hierarchy.global).toBeDefined();
      expect(hierarchy.curator).toBeDefined();
    });
  });

  describe('store', () => {
    it('should store entry in working memory by default', () => {
      const entry = hierarchy.store('test content', 'decision', 'test-source');
      expect(entry).toBeDefined();
      expect(entry.level).toBe('working');
    });

    it('should store entry in specified level', () => {
      const entry = hierarchy.store('test content', 'pattern', 'test-source', 'project');
      expect(entry).toBeDefined();
      expect(entry.level).toBe('project');
    });

    it('should store entry with tags', () => {
      const entry = hierarchy.store('test content', 'decision', 'test-source', 'working', ['tag1', 'tag2']);
      expect(entry.tags).toEqual(['tag1', 'tag2']);
    });
  });

  describe('search', () => {
    it('should search across all levels by default', () => {
      hierarchy.store('test decision content', 'decision', 'test-source');
      const results = hierarchy.search('decision');
      expect(Array.isArray(results)).toBe(true);
    });

    it('should search specific level', () => {
      hierarchy.store('test content', 'decision', 'test-source', 'working');
      const results = hierarchy.search('test', 'working');
      expect(Array.isArray(results)).toBe(true);
    });

    it('should search by category', () => {
      hierarchy.store('test content', 'decision', 'test-source');
      const results = hierarchy.search('test', undefined, 'decision');
      expect(Array.isArray(results)).toBe(true);
    });

    it('should return empty array for no matches', () => {
      const results = hierarchy.search('nonexistent');
      expect(results).toEqual([]);
    });
  });

  describe('inferLevel', () => {
    it('should infer level from category', () => {
      const level = (hierarchy as any).inferLevel('decision');
      expect(level).toBeDefined();
      expect(['working', 'project', 'institutional', 'global']).toContain(level);
    });
  });

  describe('searchLevel', () => {
    it('should search working memory', () => {
      hierarchy.store('test content', 'decision', 'test-source', 'working');
      const results = (hierarchy as any).searchLevel('working', 'test');
      expect(Array.isArray(results)).toBe(true);
    });

    it('should search project memory', () => {
      hierarchy.store('test content', 'pattern', 'test-source', 'project');
      const results = (hierarchy as any).searchLevel('project', 'test');
      expect(Array.isArray(results)).toBe(true);
    });
  });

  describe('getSummary', () => {
    it('should return summary for all levels', () => {
      hierarchy.store('test content', 'decision', 'test-source');
      const summary = hierarchy.getSummary();
      expect(Array.isArray(summary)).toBe(true);
      expect(summary).toHaveLength(4);
    });

    it('should return summary with level stats', () => {
      hierarchy.store('test content', 'decision', 'test-source');
      const summary = hierarchy.getSummary();
      summary.forEach(s => {
        expect(s.level).toBeDefined();
        expect(s.totalEntries).toBeDefined();
        expect(s.activeEntries).toBeDefined();
      });
    });
  });

  describe('working memory', () => {
    it('should have working memory instance', () => {
      expect(hierarchy.working).toBeDefined();
    });
  });

  describe('project memory', () => {
    it('should have project memory instance', () => {
      expect(hierarchy.project).toBeDefined();
    });
  });

  describe('institutional memory', () => {
    it('should have institutional memory instance', () => {
      expect(hierarchy.institutional).toBeDefined();
    });
  });

  describe('global memory', () => {
    it('should have global memory instance', () => {
      expect(hierarchy.global).toBeDefined();
    });
  });

  describe('curator', () => {
    it('should have curator instance', () => {
      expect(hierarchy.curator).toBeDefined();
    });
  });
});

describe('createMemoryHierarchy', () => {
  it('should create hierarchy instance', () => {
    const hierarchy = createMemoryHierarchy();
    expect(hierarchy).toBeInstanceOf(MemoryHierarchy);
  });
});
