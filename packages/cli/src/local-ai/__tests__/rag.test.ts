import { buildRagPrompt, formatPlainPrompt, getRagStats, DEFAULT_RAG_CONFIG } from '../rag';
import type { RagSearchResult, IngestResult, RagConfig } from '../rag';

function makeResult(overrides: Partial<RagSearchResult> = {}): RagSearchResult {
  return {
    doc: {
      id: 'doc-1',
      path: 'src/test.ts',
      content: 'export const x = 1;',
      chunkIndex: 0,
      totalChunks: 1,
      startOffset: 0,
      endOffset: 18,
      vector: [0.1, 0.2],
      model: 'nomic-embed-text',
      dimensions: 2,
      indexedAt: '2026-01-01T00:00:00Z',
      mtimeMs: Date.now(),
      fileSize: 18,
      fileHash: 'abc',
      category: 'source',
    },
    score: 0.85,
    context: '=== src/test.ts (chunk 1/1) ===\nexport const x = 1;\n',
    citation: {
      filePath: 'src/test.ts',
      fileName: 'test.ts',
      chunkIndex: 0,
      totalChunks: 1,
      snippet: 'export const x = 1;',
      relevanceScore: 0.85,
      source: 'hybrid',
      indexedAt: '2026-01-01T00:00:00Z',
    },
    ...overrides,
  };
}

describe('rag', () => {
  describe('buildRagPrompt', () => {
    it('deve incluir question e citacoes', () => {
      const prompt = buildRagPrompt('Como usar x?', [makeResult()]);
      expect(prompt).toContain('Como usar x?');
      expect(prompt).toContain('test.ts');
      expect(prompt).toContain('export const x = 1');
    });

    it('deve funcionar com contextos vazios', () => {
      const prompt = buildRagPrompt('teste', []);
      expect(prompt).toContain('teste');
    });
  });

  describe('formatPlainPrompt', () => {
    it('deve produzir prompt sem citacoes', () => {
      const prompt = formatPlainPrompt('Pergunta', [makeResult()]);
      expect(prompt).toContain('Pergunta');
      expect(prompt).toContain('src/test.ts');
      expect(prompt).not.toContain('[test.ts');
    });
  });

  describe('getRagStats', () => {
    it('deve retornar estrutura esperada para diretorio sem dados', () => {
      const stats = getRagStats('/nonexistent');
      expect(stats.dense.total).toBe(0);
      expect(stats.dense.dimensions).toBe(0);
      expect(stats.tfidf.total).toBe(0);
      expect(stats.index).toBeDefined();
      expect(stats.index.built).toBe(false);
    });
  });

  describe('IngestResult interface', () => {
    it('deve aceitar estrutura valida', () => {
      const result: IngestResult = { filesProcessed: 5, chunksIndexed: 10, errors: 0, skipped: 2 };
      expect(result.filesProcessed).toBe(5);
      expect(result.chunksIndexed).toBe(10);
    });
  });

  describe('RagConfig defaults', () => {
    it('deve ter valores padrao sensatos', () => {
      expect(DEFAULT_RAG_CONFIG.chunkSize).toBe(1000);
      expect(DEFAULT_RAG_CONFIG.chunkOverlap).toBe(200);
      expect(DEFAULT_RAG_CONFIG.embeddingModel).toBe('nomic-embed-text');
      expect(DEFAULT_RAG_CONFIG.maxResults).toBe(10);
      expect(DEFAULT_RAG_CONFIG.useCache).toBe(true);
      expect(DEFAULT_RAG_CONFIG.usePartialReindex).toBe(true);
      expect(DEFAULT_RAG_CONFIG.rankingStrategy).toBe('hybrid');
    });
  });
});
