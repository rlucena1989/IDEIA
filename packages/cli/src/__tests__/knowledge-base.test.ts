import { describe, it, expect } from '@jest/globals';
import { getCuratedEntries, searchEntries, getEntry, exportEntries, KnowledgeEntry } from '../local-ai/knowledge-base';
import path from 'node:path';
import fs from 'node:fs';
import os from 'node:os';

describe('knowledge-base', () => {
  describe('getCuratedEntries', () => {
    it('returns all curated entries', () => {
      const entries = getCuratedEntries();
      expect(entries.length).toBeGreaterThan(50);
    });

    it('each entry has required fields', () => {
      const entries = getCuratedEntries();
      for (const e of entries) {
        expect(e.id).toBeTruthy();
        expect(e.title).toBeTruthy();
        expect(e.category).toBeTruthy();
        expect(Array.isArray(e.tags)).toBe(true);
        expect(typeof e.summary).toBe('string');
        expect(typeof e.content).toBe('string');
      }
    });

    it('entry IDs are unique', () => {
      const entries = getCuratedEntries();
      const ids = entries.map(e => e.id);
      expect(new Set(ids).size).toBe(ids.length);
    });
  });

  describe('getEntry', () => {
    it('returns entry by id', () => {
      const entry = getEntry('solid-principles');
      expect(entry).toBeDefined();
      expect(entry!.title).toContain('SOLID');
    });

    it('returns undefined for unknown id', () => {
      const entry = getEntry('non-existent-id');
      expect(entry).toBeUndefined();
    });

    it('all known IDs are resolvable', () => {
      const ids = getCuratedEntries().map(e => e.id);
      for (const id of ids) {
        expect(getEntry(id)).toBeDefined();
      }
    });
  });

  describe('searchEntries', () => {
    it('returns entries matching query in title', () => {
      const results = searchEntries('SOLID');
      expect(results.length).toBeGreaterThan(0);
      expect(results.some(e => e.id === 'solid-principles')).toBe(true);
    });

    it('returns entries matching query in summary', () => {
      const results = searchEntries('hexagonal');
      expect(results.length).toBeGreaterThan(0);
      expect(results.some(e => e.id === 'hexagonal-architecture')).toBe(true);
    });

    it('returns entries matching query in tags', () => {
      const results = searchEntries('ddd');
      expect(results.length).toBeGreaterThan(0);
      expect(results.some(e => e.tags.includes('ddd'))).toBe(true);
    });

    it('returns entries matching query in category', () => {
      const results = searchEntries('security');
      expect(results.length).toBeGreaterThan(0);
      expect(results.some(e => e.category === 'security')).toBe(true);
    });

    it('is case insensitive', () => {
      const upper = searchEntries('CLEAN');
      const lower = searchEntries('clean');
      expect(upper.length).toBe(lower.length);
    });

    it('returns empty array for no match', () => {
      const results = searchEntries('zzzzz_nonexistent_query_xxxxx');
      expect(results).toEqual([]);
    });

    it('limits results to 20', () => {
      const results = searchEntries('design');
      expect(results.length).toBeLessThanOrEqual(20);
    });

    it('accepts custom entries list', () => {
      const custom: KnowledgeEntry[] = [
        { id: 'a', title: 'Alpha', category: 'test', tags: ['foo'], summary: 'first', content: 'alpha content' },
        { id: 'b', title: 'Beta', category: 'test', tags: ['bar'], summary: 'second', content: 'beta content' },
      ];
      const results = searchEntries('alpha', custom);
      expect(results).toHaveLength(1);
      expect(results[0].id).toBe('a');
    });
  });

  describe('exportEntries', () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'kb-export-'));

    afterAll(() => {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    });

    it('creates YAML files for entries', () => {
      exportEntries(tmpDir);
      const entries = getCuratedEntries();
      for (const e of entries) {
        const filePath = path.join(tmpDir, '.ai/knowledge/entries', `${e.id}.yaml`);
        expect(fs.existsSync(filePath)).toBe(true);
      }
    });

    it('does not overwrite existing files', () => {
      exportEntries(tmpDir);
      const firstMtime = fs.statSync(path.join(tmpDir, '.ai/knowledge/entries', 'solid-principles.yaml')).mtimeMs;
      exportEntries(tmpDir);
      const secondMtime = fs.statSync(path.join(tmpDir, '.ai/knowledge/entries', 'solid-principles.yaml')).mtimeMs;
      expect(secondMtime).toBe(firstMtime);
    });
  });
});
