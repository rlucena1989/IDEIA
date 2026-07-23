import path from 'node:path';
import fs from 'node:fs';
import os from 'node:os';
import { buildIndex, searchIndex, addToIndex, removeFromIndex, saveIndex, loadIndex, getIndexStats, getDefaultNumClusters } from '../vector-index';
import type { DenseVectorDoc } from '../vector-store';

const TEST_DIR = path.join(os.tmpdir(), 'ai-devkit-ivf-index-test');

function makeDoc(id: string, vector: number[], category = 'source'): DenseVectorDoc {
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
    category,
  };
}

beforeEach(() => {
  fs.mkdirSync(TEST_DIR, { recursive: true });
});

afterEach(() => {
  fs.rmSync(TEST_DIR, { recursive: true, force: true });
});

describe('getDefaultNumClusters', () => {
  it('deve retornar 2 para <=10 docs', () => {
    expect(getDefaultNumClusters(5)).toBe(2);
    expect(getDefaultNumClusters(10)).toBe(2);
  });

  it('deve retornar 4 para <=50 docs', () => {
    expect(getDefaultNumClusters(20)).toBe(4);
    expect(getDefaultNumClusters(50)).toBe(4);
  });

  it('deve retornar 8 para <=200 docs', () => {
    expect(getDefaultNumClusters(100)).toBe(8);
    expect(getDefaultNumClusters(200)).toBe(8);
  });

  it('deve retornar 16 para <=1000 docs', () => {
    expect(getDefaultNumClusters(500)).toBe(16);
    expect(getDefaultNumClusters(1000)).toBe(16);
  });

  it('deve retornar 32 para >1000 docs', () => {
    expect(getDefaultNumClusters(2000)).toBe(32);
  });
});

describe('buildIndex', () => {
  it('deve construir indice com docs similares no mesmo cluster', () => {
    const docs = [
      makeDoc('a', [0.95, 0.05]),
      makeDoc('b', [0.90, 0.10]),
      makeDoc('c', [0.10, 0.90]),
      makeDoc('d', [0.05, 0.95]),
    ];
    const index = buildIndex(docs, 2, 10);
    expect(index.centroids.length).toBe(2);
    expect(index.dimensions).toBe(2);
    expect(index.model).toBe('test-model');
    expect(index.builtAt).toBeTruthy();

    const totalDocs = index.centroids.reduce((s, c) => s + c.docIds.length, 0);
    expect(totalDocs).toBe(4);
  });

  it('deve funcionar com 1 documento', () => {
    const docs = [makeDoc('single', [0.5, 0.5])];
    const index = buildIndex(docs, 1, 5);
    expect(index.centroids.length).toBe(1);
    expect(index.centroids[0].docIds.length).toBe(1);
  });

  it('deve funcionar com array vazio de docs', () => {
    const index = buildIndex([], 2, 5);
    expect(index.centroids.length).toBe(0);
    expect(index.dimensions).toBe(0);
  });

  it('deve convergir rapidamente com dados bem separados', () => {
    const docs = Array.from({ length: 20 }, (_, i) =>
      makeDoc(`doc${i}`, i < 10 ? [0.9, 0.1] : [0.1, 0.9])
    );
    const index = buildIndex(docs, 2, 20);
    const cluster0 = index.centroids[0].docIds;
    const cluster1 = index.centroids[1].docIds;
    expect(cluster0.length + cluster1.length).toBe(20);
  });
});

describe('searchIndex', () => {
  it('deve encontrar o vizinho mais proximo', () => {
    const docs = [
      makeDoc('similar', [0.95, 0.05]),
      makeDoc('different', [0.05, 0.95]),
    ];
    const index = buildIndex(docs, 2, 10);
    const results = searchIndex([0.90, 0.10], index, docs, 5);
    expect(results.length).toBeGreaterThanOrEqual(1);
    expect(results[0].doc.id).toBe('similar');
  });

  it('deve retornar array vazio para indice vazio', () => {
    const emptyIndex = buildIndex([], 2, 5);
    const results = searchIndex([0.1, 0.2], emptyIndex, [], 5);
    expect(results).toEqual([]);
  });

  it('deve respeitar maxResults', () => {
    const docs = Array.from({ length: 20 }, (_, i) =>
      makeDoc(`doc${i}`, [0.9 - i * 0.04, 0.1 + i * 0.04])
    );
    const index = buildIndex(docs, 4, 10);
    const results = searchIndex([0.9, 0.1], index, docs, 3);
    expect(results.length).toBeLessThanOrEqual(3);
  });
});

describe('addToIndex', () => {
  it('deve adicionar novos docs ao indice existente', () => {
    const docs = [
      makeDoc('a', [0.95, 0.05]),
      makeDoc('b', [0.10, 0.90]),
    ];
    const index = buildIndex(docs, 2, 10);

    const newDocs = [makeDoc('c', [0.85, 0.15])];
    addToIndex(index, newDocs);

    const totalDocs = index.centroids.reduce((s, c) => s + c.docIds.length, 0);
    expect(totalDocs).toBe(3);

    const allDocs = [...docs, ...newDocs];
    const results = searchIndex([0.80, 0.20], index, allDocs, 5);
    const resultIds = results.map((r) => r.doc.id);
    expect(resultIds).toContain('a');
    expect(resultIds).toContain('c');
  });
});

describe('removeFromIndex', () => {
  it('deve remover docs do indice por path', () => {
    const docs = [
      makeDoc('a', [0.95, 0.05]),
      makeDoc('b', [0.10, 0.90]),
    ];
    const index = buildIndex(docs, 2, 10);

    removeFromIndex(index, ['src/a.ts'], docs);

    const totalDocs = index.centroids.reduce((s, c) => s + c.docIds.length, 0);
    expect(totalDocs).toBe(1);
  });
});

describe('saveIndex / loadIndex', () => {
  it('deve persistir e carregar indice', () => {
    const docs = [makeDoc('a', [0.9, 0.1]), makeDoc('b', [0.1, 0.9])];
    const index = buildIndex(docs, 2, 10);
    saveIndex(TEST_DIR, index);

    const loaded = loadIndex(TEST_DIR);
    expect(loaded).not.toBeNull();
    expect(loaded!.numClusters).toBe(2);
    expect(loaded!.dimensions).toBe(2);
    expect(loaded!.centroids.length).toBe(2);
  });

  it('deve retornar null se nao ha arquivo', () => {
    expect(loadIndex(TEST_DIR)).toBeNull();
  });

  it('deve retornar null para JSON corrompido', () => {
    const fp = path.join(TEST_DIR, '.ai', 'local-ai', 'rag', 'ivf-index.json');
    fs.mkdirSync(path.dirname(fp), { recursive: true });
    fs.writeFileSync(fp, 'not-json{{{');
    expect(loadIndex(TEST_DIR)).toBeNull();
  });
});

describe('getIndexStats', () => {
  it('deve retornar stats validos para indice existente', () => {
    const docs = [makeDoc('a', [0.9, 0.1]), makeDoc('b', [0.1, 0.9])];
    const index = buildIndex(docs, 2, 10);
    const stats = getIndexStats(index);
    expect(stats.built).toBe(true);
    expect(stats.numClusters).toBe(2);
    expect(stats.totalDocs).toBe(2);
    expect(stats.dimensions).toBe(2);
    expect(stats.avgDocsPerCluster).toBe(1);
  });

  it('deve retornar built=false para null', () => {
    const stats = getIndexStats(null);
    expect(stats.built).toBe(false);
    expect(stats.totalDocs).toBe(0);
  });

  it('deve retornar built=false para indice vazio', () => {
    const emptyIndex = buildIndex([], 2, 5);
    const stats = getIndexStats(emptyIndex);
    expect(stats.built).toBe(false);
  });
});
