import fs from 'node:fs';
import { createLogger } from '@ideia/logger';
import path from 'node:path';
import { cosineSimilarityDense, normalizeVector } from './embeddings';

/** Interface que define a estrutura de dense vector doc. */
export interface DenseVectorDoc {
  id: string;
  path: string;
  content: string;
  chunkIndex: number;
  totalChunks: number;
  startOffset: number;
  endOffset: number;
  vector: number[];
  model: string;
  dimensions: number;
  indexedAt: string;
  mtimeMs: number;
  fileSize: number;
  fileHash: string;
  category: string;
}

/** Interface que define a estrutura de vector search result. */
export interface VectorSearchResult {
  doc: DenseVectorDoc;
  score: number;
}

/** Interface que define a estrutura de cache entry. */
export interface CacheEntry {
  query: string;
  results: VectorSearchResult[];
  cachedAt: number;
  ttlMs: number;
  category: string;
}

/** Processa a g_ d i r. */
export const RAG_DIR = '.ai/local-ai/rag';
/** Processa e c t o r s_ f i l e. */
export const VECTORS_FILE = 'vectors.json';
/** Processa a c h e_ f i l e. */
export const CACHE_FILE = 'cache.json';
/** Processa e f a u l t_ t t l_ m s. */
export const DEFAULT_TTL_MS = 5 * 60 * 1000;

/** TTL por categoria de documento (ms). */
export const TTL_BY_CATEGORY: Record<string, number> = {
  source: 10 * 60 * 1000,
  documentation: 30 * 60 * 1000,
  tests: 5 * 60 * 1000,
  config: 15 * 60 * 1000,
  scripts: 10 * 60 * 1000,
  other: 5 * 60 * 1000,
};

function getVectorsPath(root: string): string {
  return path.join(root, RAG_DIR, VECTORS_FILE);
}

/**
 * Carrega vectors.
 * @param root - Valor root.
 * @returns O resultado da operação.
 */
export function loadVectors(root: string): DenseVectorDoc[] {
  const vp = getVectorsPath(root);
  if (!fs.existsSync(vp)) return [];
  try {
    return JSON.parse(fs.readFileSync(vp, 'utf8'));
  } catch {
    return [];
  }
}

/**
 * Persiste vectors.
 * @param root - Valor root.
 * @param docs - Valor docs.
 */
export function saveVectors(root: string, docs: DenseVectorDoc[]): void {
  const vp = getVectorsPath(root);
  fs.mkdirSync(path.dirname(vp), { recursive: true });
  fs.writeFileSync(vp, JSON.stringify(docs, null, 2));
}

/**
 * Processa vector docs.
 * @param root - Valor root.
 * @param newDocs - Valor docs.
 */
export function addVectorDocs(root: string, newDocs: DenseVectorDoc[]): void {
  const existing = loadVectors(root);
  const existingIds = new Set(existing.map((d) => d.id));

  const unique = newDocs.filter((d) => !existingIds.has(d.id));

  saveVectors(root, [...existing, ...unique]);
}

/**
 * Pesquisa vectors usando IVF index quando disponível.
 * @param root - Valor root.
 * @param queryVector - Consulta vector.
 * @param maxResults - Valor results.
 * @param minScore - Valor score.
 * @returns O resultado da operação.
 */
export function searchVectors(
  root: string,
  queryVector: number[],
  maxResults: number = 10,
  minScore: number = 0.0
): VectorSearchResult[] {
  const docs = loadVectors(root);
  const qv = normalizeVector(queryVector);

  if (docs.length <= 50) {
    const scored: VectorSearchResult[] = [];
    for (const doc of docs) {
      const dv = normalizeVector(doc.vector);
      const score = cosineSimilarityDense(qv, dv);
      if (score >= minScore) {
        scored.push({ doc, score });
      }
    }
    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, maxResults);
  }

  const { loadIndex, searchIndex } = require('./vector-index') as typeof import('./vector-index');
  const index = loadIndex(root);
  if (!index) {
    const scored: VectorSearchResult[] = [];
    for (const doc of docs) {
      const dv = normalizeVector(doc.vector);
      const score = cosineSimilarityDense(qv, dv);
      if (score >= minScore) {
        scored.push({ doc, score });
      }
    }
    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, maxResults);
  }

  const results = searchIndex(qv, index, docs, maxResults * 2);
  const filtered = results
    .filter((r) => r.score >= minScore)
    .slice(0, maxResults)
    .map((r) => ({ doc: r.doc, score: r.score }));
  return filtered;
}

/**
 * Reconstrói o IVF index a partir dos vetores persistidos.
 * @param root - Valor root.
 */
export function rebuildVectorIndex(root: string): void {
  const docs = loadVectors(root);
  if (docs.length === 0) return;
  const { buildIndex, saveIndex } = require('./vector-index') as typeof import('./vector-index');
  const index = buildIndex(docs);
  saveIndex(root, index);
}

/**
 * Limpa vectors.
 * @param root - Valor root.
 */
export function clearVectors(root: string): void {
  const vp = getVectorsPath(root);
  if (fs.existsSync(vp)) {
    fs.unlinkSync(vp);
  }
}

function getCachePath(root: string): string {
  return path.join(root, RAG_DIR, CACHE_FILE);
}

/**
 * Carrega cache.
 * @param root - Valor root.
 * @returns O resultado da operação.
 */
export function loadCache(root: string): CacheEntry[] {
  const cp = getCachePath(root);
  if (!fs.existsSync(cp)) return [];
  try {
    return JSON.parse(fs.readFileSync(cp, 'utf8'));
  } catch { return []; }
}

/**
 * Persiste cache.
 * @param root - Valor root.
 * @param entries - Valor entries.
 */
export function saveCache(root: string, entries: CacheEntry[]): void {
  const cp = getCachePath(root);
  fs.mkdirSync(path.dirname(cp), { recursive: true });
  fs.writeFileSync(cp, JSON.stringify(entries, null, 2));
}

/**
 * Obtém cached results.
 * @param root - Valor root.
 * @param query - Consulta query.
 * @param category - Categoria do documento (opcional).
 * @returns O resultado da operação.
 */
export function getCachedResults(root: string, query: string, category?: string): VectorSearchResult[] | null {
  const entries = loadCache(root);
  const now = Date.now();
  for (const entry of entries) {
    if (entry.query === query && (now - entry.cachedAt) < entry.ttlMs) {
      if (category && entry.category !== category) continue;
      return entry.results;
    }
  }
  return null;
}

function resolveTtl(category?: string): number {
  if (category && TTL_BY_CATEGORY[category] !== undefined) {
    return TTL_BY_CATEGORY[category];
  }
  return DEFAULT_TTL_MS;
}

/**
 * Define cached results.
 * @param root - Valor root.
 * @param query - Consulta query.
 * @param results - Valor results.
 * @param ttlMs - Valor ms.
 * @param category - Categoria do documento (opcional, para TTL específico).
 */
export function setCachedResults(root: string, query: string, results: VectorSearchResult[], ttlMs?: number, category?: string): void {
  const entries = loadCache(root).filter((e) => e.query !== query);
  const effectiveTtl = ttlMs ?? resolveTtl(category);
  entries.push({ query, results, cachedAt: Date.now(), ttlMs: effectiveTtl, category: category || 'other' });
  const maxEntries = 50;
  if (entries.length > maxEntries) entries.splice(0, entries.length - maxEntries);
  saveCache(root, entries);
}

/**
 * Limpa cache.
 * @param root - Valor root.
 */
export function clearCache(root: string): void {
  const cp = getCachePath(root);
  if (fs.existsSync(cp)) fs.unlinkSync(cp);
}

/**
 * Obtém vector stats.
 * @param root - Valor root.
 * @returns O resultado da operação.
 */
export function getVectorStats(root: string): { total: number; dimensions: number; model: string } {
  const docs = loadVectors(root);
  if (docs.length === 0) return { total: 0, dimensions: 0, model: 'none' };
  return {
    total: docs.length,
    dimensions: docs[0]?.dimensions ?? 0,
    model: docs[0]?.model ?? 'none',
  };
}
