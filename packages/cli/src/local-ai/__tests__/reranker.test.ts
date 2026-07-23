import { computeLexicalScore, computeHybridScore, rerank } from '../reranker';
import type { DenseVectorDoc } from '../vector-store';

function makeDoc(overrides: Partial<DenseVectorDoc> = {}): DenseVectorDoc {
  return {
    id: 'doc-1',
    path: 'src/test.ts',
    content: 'implementacao de busca semantica com embeddings',
    chunkIndex: 0,
    totalChunks: 1,
    startOffset: 0,
    endOffset: 50,
    vector: [0.1, 0.2, 0.3],
    model: 'nomic-embed-text',
    dimensions: 3,
    indexedAt: new Date().toISOString(),
    mtimeMs: Date.now(),
    fileSize: 50,
    fileHash: 'abc123',
    category: 'source',
    ...overrides,
  };
}

describe('reranker', () => {
  describe('computeLexicalScore', () => {
    it('deve retornar 1.0 quando todos os termos aparecem', () => {
      const score = computeLexicalScore('implementacao de busca semantica', ['busca', 'semantica']);
      expect(score).toBeGreaterThan(0.5);
    });

    it('deve retornar 0 quando nenhum termo aparece', () => {
      expect(computeLexicalScore('texto aleatorio', ['xyzzero', 'outro'])).toBe(0);
    });

    it('deve ser case-insensitive', () => {
      const scoreLow = computeLexicalScore('BUSCA', ['busca']);
      const scoreUp = computeLexicalScore('busca', ['BUSCA']);
      expect(scoreLow).toBe(scoreUp);
    });
  });

  describe('computeHybridScore', () => {
    it('deve combinar pesos corretamente', () => {
      const score = computeHybridScore(1, 0.5, 0.5, { semanticWeight: 0.5, freshnessWeight: 0.25, lexicalWeight: 0.25 });
      expect(score).toBeCloseTo(0.75, 5);
    });

    it('deve usar pesos padrao quando config nao fornecido', () => {
      const score = computeHybridScore(1, 0, 0);
      expect(score).toBeCloseTo(0.5, 5);
    });
  });

  describe('rerank', () => {
    it('deve ordenar por hybridScore decrescente', () => {
      const docs = [
        makeDoc({ id: 'a', content: 'inteligencia artificial machine learning', vector: [1, 0, 0], mtimeMs: Date.now() }),
        makeDoc({ id: 'b', content: 'desenvolvimento web frontend react', vector: [0, 1, 0], mtimeMs: Date.now() - 86400000 }),
      ];
      const results = rerank(docs, [0.8, 0.1, 0.1], ['inteligencia', 'artificial']);
      expect(results.length).toBe(2);
      expect(results[0].hybridScore).toBeGreaterThanOrEqual(results[1].hybridScore);
    });

    it('deve retornar array vazio para docs vazio', () => {
      const results = rerank([], [1, 0, 0], ['teste']);
      expect(results).toEqual([]);
    });

    it('deve respeitar estrategia semantic', () => {
      const docs = [
        makeDoc({ id: 'a', vector: [1, 0, 0] }),
        makeDoc({ id: 'b', vector: [0, 1, 0] }),
      ];
      const results = rerank(docs, [0.9, 0, 0], ['x'], { strategy: 'semantic' });
      expect(results[0].hybridScore).toBe(results[0].semanticScore);
    });

    it('deve respeitar estrategia freshness', () => {
      const docs = [
        makeDoc({ id: 'a', mtimeMs: Date.now() }),
        makeDoc({ id: 'b', mtimeMs: Date.now() - 86400000 }),
      ];
      const results = rerank(docs, [0, 0, 0], ['x'], { strategy: 'freshness' });
      expect(results[0].hybridScore).toBe(results[0].freshnessScore);
    });

    it('deve respeitar estrategia lexical', () => {
      const docs = [
        makeDoc({ id: 'a', content: 'palavra alvo presente' }),
        makeDoc({ id: 'b', content: 'nenhuma aqui' }),
      ];
      const results = rerank(docs, [0, 0, 0], ['palavra'], { strategy: 'lexical' });
      expect(results[0].hybridScore).toBe(results[0].lexicalScore);
    });

    it('deve incluir todos os scores no resultado', () => {
      const docs = [makeDoc()];
      const results = rerank(docs, [0.1, 0.2, 0.3], ['teste']);
      expect(results[0].semanticScore).toBeDefined();
      expect(results[0].freshnessScore).toBeDefined();
      expect(results[0].lexicalScore).toBeDefined();
      expect(results[0].hybridScore).toBeDefined();
    });
  });
});
