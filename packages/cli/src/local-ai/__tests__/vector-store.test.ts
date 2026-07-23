import path from 'node:path';
import fs from 'node:fs';
import os from 'node:os';
import { loadVectors, saveVectors, addVectorDocs, clearVectors, searchVectors, loadCache, saveCache, getCachedResults, setCachedResults, clearCache, getVectorStats, DEFAULT_TTL_MS, TTL_BY_CATEGORY, rebuildVectorIndex } from '../vector-store';
import type { DenseVectorDoc } from '../vector-store';

const TEST_DIR = path.join(os.tmpdir(), 'ai-devkit-vector-store-test');

function makeDoc(id: string, vector: number[]): DenseVectorDoc {
  return {
    id,
    path: `src/${id}.ts`,
    content: `content ${id}`,
    chunkIndex: 0,
    totalChunks: 1,
    startOffset: 0,
    endOffset: 10,
    vector,
    model: 'test-model',
    dimensions: vector.length,
    indexedAt: new Date().toISOString(),
    mtimeMs: Date.now(),
    fileSize: 10,
    fileHash: `hash-${id}`,
    category: 'source',
  };
}

beforeEach(() => {
  fs.mkdirSync(TEST_DIR, { recursive: true });
});

afterEach(() => {
  fs.rmSync(TEST_DIR, { recursive: true, force: true });
});

describe('vector-store', () => {
  describe('saveVectors / loadVectors', () => {
    it('deve persistir e carregar vetores', () => {
      const docs = [makeDoc('doc1', [0.1, 0.2])];
      saveVectors(TEST_DIR, docs);
      const loaded = loadVectors(TEST_DIR);
      expect(loaded.length).toBe(1);
      expect(loaded[0].id).toBe('doc1');
    });

    it('deve retornar array vazio quando nao ha arquivo', () => {
      expect(loadVectors(TEST_DIR)).toEqual([]);
    });

    it('deve retornar array vazio para JSON corrompido', () => {
      const vp = path.join(TEST_DIR, '.ai', 'local-ai', 'rag', 'vectors.json');
      fs.mkdirSync(path.dirname(vp), { recursive: true });
      fs.writeFileSync(vp, 'not-json{{{');
      expect(loadVectors(TEST_DIR)).toEqual([]);
    });
  });

  describe('addVectorDocs', () => {
    it('deve adicionar documentos unicos', () => {
      addVectorDocs(TEST_DIR, [makeDoc('a', [0.1]), makeDoc('b', [0.2])]);
      expect(loadVectors(TEST_DIR).length).toBe(2);
    });

    it('nao deve duplicar documentos com mesmo id', () => {
      addVectorDocs(TEST_DIR, [makeDoc('a', [0.1])]);
      addVectorDocs(TEST_DIR, [makeDoc('a', [0.2])]);
      expect(loadVectors(TEST_DIR).length).toBe(1);
    });
  });

  describe('clearVectors', () => {
    it('deve remover arquivo de vetores', () => {
      saveVectors(TEST_DIR, [makeDoc('x', [0.1])]);
      clearVectors(TEST_DIR);
      expect(loadVectors(TEST_DIR)).toEqual([]);
    });
  });

  describe('searchVectors', () => {
    it('deve retornar resultados ordenados por score', () => {
      saveVectors(TEST_DIR, [
        makeDoc('similar', [0.9, 0.1]),
        makeDoc('different', [0.1, 0.9]),
      ]);
      const results = searchVectors(TEST_DIR, [0.95, 0.05], 5, 0);
      expect(results.length).toBe(2);
      expect(results[0].score).toBeGreaterThanOrEqual(results[1].score);
    });

    it('deve respeitar maxResults', () => {
      saveVectors(TEST_DIR, [
        makeDoc('a', [0.9, 0.1]),
        makeDoc('b', [0.8, 0.2]),
        makeDoc('c', [0.7, 0.3]),
      ]);
      expect(searchVectors(TEST_DIR, [0.9, 0.1], 2, 0).length).toBe(2);
    });

    it('deve respeitar minScore', () => {
      saveVectors(TEST_DIR, [makeDoc('a', [0.9, 0.1]), makeDoc('b', [0.1, 0.9])]);
      const results = searchVectors(TEST_DIR, [0.9, 0.1], 5, 0.5);
      expect(results.length).toBe(1);
    });

    it('deve retornar array vazio quando nao ha vetores', () => {
      expect(searchVectors(TEST_DIR, [0.1, 0.2], 5, 0)).toEqual([]);
    });
  });

  describe('cache', () => {
    it('deve armazenar e recuperar resultados em cache', () => {
      const results = searchVectors(TEST_DIR, [0.1, 0.2]);
      setCachedResults(TEST_DIR, 'test-query', results, 60000);
      const cached = getCachedResults(TEST_DIR, 'test-query');
      expect(cached).not.toBeNull();
    });

    it('deve retornar null para consulta nao cacheada', () => {
      expect(getCachedResults(TEST_DIR, 'inexistente')).toBeNull();
    });

    it('deve respeitar TTL', () => {
      setCachedResults(TEST_DIR, 'stale', [], -1);
      const cached = getCachedResults(TEST_DIR, 'stale');
      expect(cached).toBeNull();
    });

    it('clearCache deve limpar arquivo de cache', () => {
      setCachedResults(TEST_DIR, 'q', []);
      clearCache(TEST_DIR);
      expect(getCachedResults(TEST_DIR, 'q')).toBeNull();
    });
  });

  describe('TTL_BY_CATEGORY', () => {
    it('deve ter TTLs definidos para todas as categorias', () => {
      expect(TTL_BY_CATEGORY.source).toBe(10 * 60 * 1000);
      expect(TTL_BY_CATEGORY.documentation).toBe(30 * 60 * 1000);
      expect(TTL_BY_CATEGORY.tests).toBe(5 * 60 * 1000);
      expect(TTL_BY_CATEGORY.config).toBe(15 * 60 * 1000);
      expect(TTL_BY_CATEGORY.other).toBe(5 * 60 * 1000);
    });
  });

  describe('rebuildVectorIndex', () => {
    it('deve reconstruir indice sem erros', () => {
      const docs = [
        makeDoc('a', [0.9, 0.1]),
        makeDoc('b', [0.1, 0.9]),
      ];
      saveVectors(TEST_DIR, docs);
      expect(() => rebuildVectorIndex(TEST_DIR)).not.toThrow();
    });

    it('nao deve falhar se nao ha vetores', () => {
      expect(() => rebuildVectorIndex(TEST_DIR)).not.toThrow();
    });
  });

  describe('getVectorStats', () => {
    it('deve retornar estatisticas dos vetores', () => {
      saveVectors(TEST_DIR, [makeDoc('a', [0.1, 0.2]), makeDoc('b', [0.3, 0.4])]);
      const stats = getVectorStats(TEST_DIR);
      expect(stats.total).toBe(2);
      expect(stats.dimensions).toBe(2);
      expect(stats.model).toBe('test-model');
    });

    it('deve retornar zeros se nao ha vetores', () => {
      const stats = getVectorStats(TEST_DIR);
      expect(stats.total).toBe(0);
      expect(stats.dimensions).toBe(0);
      expect(stats.model).toBe('none');
    });
  });
});
