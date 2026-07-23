import { describe, it, expect } from '@jest/globals';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import * as ragConnector from '../rag-connector';
import { RagDoc, RagResult } from '../rag-connector';

function makeDoc(pathStr: string, content: string, cat = 'source'): RagDoc {
  return { id: '1', path: pathStr, content, chunkIndex: 0, totalChunks: 1, category: cat, indexedAt: '2026-01-01' };
}

function makeResult(pathStr: string, content: string, score: number): RagResult {
  return { doc: makeDoc(pathStr, content), score };
}

function createTempVectors(docs: RagDoc[]): string {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'rag-test-'));
  fs.mkdirSync(path.join(tmpDir, '.ai', 'local-ai', 'rag'), { recursive: true });
  fs.writeFileSync(path.join(tmpDir, '.ai', 'local-ai', 'rag', 'vectors.json'), JSON.stringify(docs), 'utf8');
  return tmpDir;
}

describe('rag-connector', () => {
  describe('searchTfIdf', () => {
    it('returns empty array for empty query', () => {
      const docs = [makeDoc('a.ts', 'hello world')];
      const results = ragConnector.searchTfIdf('', docs);
      expect(results).toEqual([]);
    });

    it('finds relevant documents by content', () => {
      const docs = [
        makeDoc('src/api.ts', 'API route for handling user requests with JSON'),
        makeDoc('src/db.ts', 'Database connection to PostgreSQL'),
      ];
      const results = ragConnector.searchTfIdf('api requests', docs, 5);
      expect(results.length).toBe(1);
      expect(results[0].doc.path).toBe('src/api.ts');
      expect(results[0].score).toBeGreaterThan(0);
    });

    it('returns empty array when no terms match', () => {
      const docs = [makeDoc('a.ts', 'function foo() { return 42; }')];
      const results = ragConnector.searchTfIdf('xyznonexistent', docs);
      expect(results).toEqual([]);
    });

    it('respects maxResults limit', () => {
      const docs = Array.from({ length: 10 }, (_, i) => makeDoc(`f${i}.ts`, `common token token${i}`));
      const results = ragConnector.searchTfIdf('common token', docs, 3);
      expect(results.length).toBeLessThanOrEqual(3);
    });

    it('ranks by relevance score', () => {
      const docs = [
        makeDoc('src/api.ts', 'API route handler for user endpoints with JSON'),
        makeDoc('src/db.ts', 'Database connection to PostgreSQL'),
      ];
      const results = ragConnector.searchTfIdf('api database', docs, 5);
      expect(results.length).toBe(2);
      expect(results[0].score).toBeGreaterThan(0);
    });

    it('handles single document', () => {
      const docs = [makeDoc('src/calc.ts', 'precision calculation for financial math')];
      const results = ragConnector.searchTfIdf('financial precision', docs, 5);
      expect(results.length).toBe(1);
      expect(results[0].doc.path).toBe('src/calc.ts');
      expect(results[0].score).toBeGreaterThan(0);
    });
  });

  describe('searchWithRag (file-based)', () => {
    it('returns source none when no vectors exist', () => {
      const tmpDir = createTempVectors([]);
      try {
        const result = ragConnector.searchWithRag('test', tmpDir);
        expect(result.source).toBe('none');
      } finally {
        fs.rmSync(tmpDir, { recursive: true, force: true });
      }
    });

    it('returns source none when directory does not exist', () => {
      const result = ragConnector.searchWithRag('test', '/nonexistent/path');
      expect(result.source).toBe('none');
    });

    it('returns results from vectors.json', () => {
      const docs = [makeDoc('src/test.ts', 'calculate the sum of two numbers')];
      const tmpDir = createTempVectors(docs);
      try {
        const result = ragConnector.searchWithRag('calculate sum', tmpDir, 2);
        expect(result.source).toBe('tfidf');
        expect(result.results.length).toBe(1);
        expect(result.results[0].doc.path).toContain('test.ts');
      } finally {
        fs.rmSync(tmpDir, { recursive: true, force: true });
      }
    });
  });

  describe('buildRagContext', () => {
    it('returns empty string when no vectors exist', () => {
      expect(ragConnector.buildRagContext('test', 3)).toBe('');
    });
  });

  describe('buildRagEnhancedInput', () => {
    it('returns original input when no vectors exist', () => {
      expect(ragConnector.buildRagEnhancedInput('task')).toBe('task');
    });
  });

  describe('extractCitations', () => {
    it('returns empty array when no context matches', () => {
      expect(ragConnector.extractCitations('random text')).toEqual([]);
    });
  });

  describe('formatRagAnswer', () => {
    it('builds prompt with context and question', () => {
      const prompt = ragConnector.formatRagAnswer('How does add work?', [
        makeResult('src/test.ts', 'function add(a, b) { return a + b; }', 0.85),
      ]);
      expect(prompt).toContain('src/test.ts');
      expect(prompt).toContain('function add');
      expect(prompt).toContain('How does add work?');
      expect(prompt).toContain('<context>');
      expect(prompt).toContain('</context>');
    });

    it('builds prompt with multiple contexts', () => {
      const prompt = ragConnector.formatRagAnswer('question', [
        makeResult('src/a.ts', 'file a', 0.9),
        makeResult('src/b.ts', 'file b', 0.7),
      ]);
      expect(prompt).toContain('src/a.ts');
      expect(prompt).toContain('src/b.ts');
      expect(prompt).toContain('chunk 1/1');
    });

    it('handles empty context array', () => {
      const prompt = ragConnector.formatRagAnswer('question', []);
      expect(prompt).toContain('question');
      expect(prompt).toContain('<context>');
    });
  });

  describe('getRagStats', () => {
    it('returns zero stats when directory does not exist', () => {
      const stats = ragConnector.getRagStats('/nonexistent');
      expect(stats.totalDocs).toBe(0);
      expect(stats.hasVectors).toBe(false);
      expect(stats.categories).toEqual({});
    });

    it('returns stats with categories when vectors exist', () => {
      const docs = [
        makeDoc('src/a.ts', 'src content', 'source'),
        makeDoc('docs/r.md', 'doc content', 'documentation'),
      ];
      const tmpDir = createTempVectors(docs);
      try {
        const stats = ragConnector.getRagStats(tmpDir);
        expect(stats.totalDocs).toBe(2);
        expect(stats.hasVectors).toBe(true);
        expect(stats.categories.source).toBe(1);
        expect(stats.categories.documentation).toBe(1);
      } finally {
        fs.rmSync(tmpDir, { recursive: true, force: true });
      }
    });
  });
});
