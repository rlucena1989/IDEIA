import { buildCitation, buildCitationsFromResults, groupCitationsByFile, formatCitationsMd, buildPromptWithCitations } from '../citations';
import type { DenseVectorDoc } from '../vector-store';
import type { RankedResult } from '../reranker';

function makeDoc(overrides: Partial<DenseVectorDoc> = {}): DenseVectorDoc {
  return {
    id: 'doc-1',
    path: 'src/main.ts',
    content: 'function hello() { return "world"; }',
    chunkIndex: 0,
    totalChunks: 2,
    startOffset: 0,
    endOffset: 35,
    vector: [0.1, 0.2],
    model: 'nomic-embed-text',
    dimensions: 2,
    indexedAt: '2026-01-01T00:00:00Z',
    mtimeMs: Date.now(),
    fileSize: 35,
    fileHash: 'abc',
    category: 'source',
    ...overrides,
  };
}

function makeRanked(doc: DenseVectorDoc, hybridScore = 0.85): RankedResult {
  return { doc, semanticScore: 0.8, freshnessScore: 0.7, lexicalScore: 0.6, hybridScore };
}

describe('citations', () => {
  describe('buildCitation', () => {
    it('deve construir citacao com estrutura correta', () => {
      const doc = makeDoc();
      const cit = buildCitation(doc, 0.85, 'hybrid');
      expect(cit.filePath).toBe('src/main.ts');
      expect(cit.fileName).toBe('main.ts');
      expect(cit.chunkIndex).toBe(0);
      expect(cit.totalChunks).toBe(2);
      expect(cit.relevanceScore).toBe(0.85);
      expect(cit.source).toBe('hybrid');
    });

    it('deve truncar snippet se maior que 200 chars', () => {
      const doc = makeDoc({ content: 'x'.repeat(500) });
      const cit = buildCitation(doc, 0.5, 'dense');
      expect(cit.snippet.endsWith('...')).toBe(true);
      expect(cit.snippet.length).toBeLessThanOrEqual(203);
    });
  });

  describe('buildCitationsFromResults', () => {
    it('deve mapear resultados para citacoes', () => {
      const results = [makeRanked(makeDoc())];
      const citations = buildCitationsFromResults(results, 'hybrid');
      expect(citations.length).toBe(1);
      expect(citations[0].source).toBe('hybrid');
    });

    it('deve retornar array vazio para resultados vazios', () => {
      expect(buildCitationsFromResults([])).toEqual([]);
    });
  });

  describe('groupCitationsByFile', () => {
    it('deve agrupar citacoes do mesmo arquivo', () => {
      const citations = [
        buildCitation(makeDoc({ path: 'src/a.ts', chunkIndex: 0 }), 0.8, 'hybrid'),
        buildCitation(makeDoc({ path: 'src/a.ts', chunkIndex: 1 }), 0.6, 'hybrid'),
        buildCitation(makeDoc({ path: 'src/b.ts', chunkIndex: 0 }), 0.9, 'hybrid'),
      ];
      const groups = groupCitationsByFile(citations);
      expect(groups.length).toBe(2);
      const groupA = groups.find(g => g.fileName === 'a.ts');
      expect(groupA).toBeDefined();
      expect(groupA!.citations.length).toBe(2);
    });

    it('deve ordenar grupos por relevancia total decrescente', () => {
      const citations = [
        buildCitation(makeDoc({ path: 'src/low.ts' }), 0.1, 'hybrid'),
        buildCitation(makeDoc({ path: 'src/high.ts' }), 0.9, 'hybrid'),
      ];
      const groups = groupCitationsByFile(citations);
      expect(groups[0].totalRelevance).toBeGreaterThanOrEqual(groups[1].totalRelevance);
    });
  });

  describe('formatCitationsMd', () => {
    it('deve produzir markdown valido', () => {
      const citations = [
        buildCitation(makeDoc({ path: 'src/main.ts', content: 'function hello()' }), 0.85, 'hybrid'),
      ];
      const md = formatCitationsMd(citations);
      expect(md).toContain('main.ts');
      expect(md).toContain('function hello()');
      expect(md).toContain('Chunk');
    });

    it('deve retornar string vazia para lista vazia', () => {
      expect(formatCitationsMd([])).toBe('');
    });
  });

  describe('buildPromptWithCitations', () => {
    it('deve incluir contexto e question', () => {
      const citations = [
        buildCitation(makeDoc({ content: 'export const x = 1;' }), 0.9, 'hybrid'),
      ];
      const prompt = buildPromptWithCitations('Como usar x?', citations);
      expect(prompt).toContain('Como usar x?');
      expect(prompt).toContain('export const x = 1;');
      expect(prompt).toContain('main.ts');
    });

    it('deve funcionar com citacoes vazias', () => {
      const prompt = buildPromptWithCitations('teste', []);
      expect(prompt).toContain('teste');
    });
  });
});
