import { RAG_DIR, VECTORS_FILE, DenseVectorDoc, VectorSearchResult, loadVectors, saveVectors, addVectorDocs, searchVectors, clearVectors, getVectorStats } from '../local-ai/vector-store';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

describe('vector-store - types', () => {
  it('RAG_DIR e VECTORS_FILE devem estar definidos', () => {
    expect(RAG_DIR).toBe('.ai/local-ai/rag');
    expect(VECTORS_FILE).toBe('vectors.json');
  });

  it('DenseVectorDoc deve ter todos os campos', () => {
    const doc: DenseVectorDoc = {
      id: 'doc-1', path: 'src/index.ts', content: 'hello',
      chunkIndex: 0, totalChunks: 1, startOffset: 0, endOffset: 5,
      vector: [0.1, 0.2, 0.3], model: 'nomic-embed-text', dimensions: 3,
      indexedAt: '2026-01-01T00:00:00.000Z',
      mtimeMs: 0, fileSize: 5, fileHash: 'abc', category: 'source',
    };
    expect(doc.id).toBe('doc-1');
    expect(doc.vector).toHaveLength(3);
  });
});

describe('vector-store - operations', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'vs-'));
  });

  afterEach(() => {
    try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch {}
  });

  const makeDoc = (id: string, vector?: number[]): DenseVectorDoc => ({
    id, path: 'test.ts', content: 'test', chunkIndex: 0, totalChunks: 1,
    startOffset: 0, endOffset: 4,
    vector: vector || [1, 0, 0], model: 'test-model', dimensions: 3,
    indexedAt: '2026-01-01T00:00:00.000Z',
    mtimeMs: 0, fileSize: 4, fileHash: 'abc', category: 'source',
  });

  it('loadVectors deve retornar array vazio se nao existe', () => {
    const docs = loadVectors(tmpDir);
    expect(docs).toEqual([]);
  });

  it('saveVectors+loadVectors devem persistir dados', () => {
    const docs = [makeDoc('d1'), makeDoc('d2')];
    saveVectors(tmpDir, docs);
    const loaded = loadVectors(tmpDir);
    expect(loaded).toHaveLength(2);
  });

  it('addVectorDocs deve adicionar documentos unicos', () => {
    addVectorDocs(tmpDir, [makeDoc('a')]);
    addVectorDocs(tmpDir, [makeDoc('b')]);
    expect(loadVectors(tmpDir)).toHaveLength(2);
  });

  it('addVectorDocs nao deve duplicar IDs existentes', () => {
    addVectorDocs(tmpDir, [makeDoc('dup')]);
    addVectorDocs(tmpDir, [makeDoc('dup')]);
    expect(loadVectors(tmpDir)).toHaveLength(1);
  });

  it('getVectorStats deve retornar zeros para store vazia', () => {
    const stats = getVectorStats(tmpDir);
    expect(stats.total).toBe(0);
    expect(stats.model).toBe('none');
  });

  it('getVectorStats deve retornar stats corretos', () => {
    saveVectors(tmpDir, [makeDoc('s1', [0.1, 0.2])]);
    const stats = getVectorStats(tmpDir);
    expect(stats.total).toBe(1);
    expect(stats.dimensions).toBe(3); // makeDoc default dimensions=3
  });

  it('clearVectors deve remover arquivo', () => {
    saveVectors(tmpDir, [makeDoc('c1')]);
    clearVectors(tmpDir);
    expect(loadVectors(tmpDir)).toEqual([]);
  });

  it('searchVectors deve retornar resultados ordenados por score', () => {
    saveVectors(tmpDir, [
      makeDoc('close', [0.9, 0.1, 0]),
      makeDoc('far', [0, 0, 1]),
    ]);
    const results = searchVectors(tmpDir, [1, 0, 0], 2, 0);
    expect(results).toHaveLength(2);
    expect(results[0].score).toBeGreaterThanOrEqual(results[1].score);
  });

  it('searchVectors deve respeitar minScore', () => {
    addVectorDocs(tmpDir, [makeDoc('far', [0, 0, 1])]);
    const results = searchVectors(tmpDir, [1, 0, 0], 10, 0.9);
    expect(results).toHaveLength(0);
  });
});

import { IngestResult, RagConfig } from '../local-ai/rag';

describe('rag - types', () => {
  it('RagConfig deve ter valores padrao', () => {
    const config: RagConfig = { chunkSize: 1000, chunkOverlap: 200, embeddingModel: 'nomic-embed-text', ollamaHost: 'http://localhost:11434', maxResults: 10, minScore: 0.0, useCache: true, cacheTtlMs: 300000, usePartialReindex: true, rankingStrategy: 'hybrid', semanticWeight: 0.5, freshnessWeight: 0.25, lexicalWeight: 0.25 };
    expect(config.chunkSize).toBe(1000);
    expect(config.embeddingModel).toBe('nomic-embed-text');
    expect(config.maxResults).toBe(10);
    expect(config.rankingStrategy).toBe('hybrid');
  });

  it('RagConfig deve aceitar config override', () => {
    const config: RagConfig = { chunkSize: 500, chunkOverlap: 100, embeddingModel: 'nomic-embed-text', ollamaHost: 'http://localhost:11434', maxResults: 5, minScore: 0.1, useCache: false, cacheTtlMs: 0, usePartialReindex: false, rankingStrategy: 'semantic', semanticWeight: 1, freshnessWeight: 0, lexicalWeight: 0 };
    expect(config.chunkSize).toBe(500);
    expect(config.rankingStrategy).toBe('semantic');
  });

  it('IngestResult deve ter filesProcessed, chunksIndexed, errors, skipped', () => {
    const result: IngestResult = { filesProcessed: 5, chunksIndexed: 20, errors: 0, skipped: 0 };
    expect(result.filesProcessed).toBe(5);
    expect(result.chunksIndexed).toBe(20);
  });
});