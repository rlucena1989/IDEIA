import { IndexedDocument, cosineSimilarity, generateTFIDFVector, extractRelevantChunk } from './embeddings';
import { createLogger } from '@ideia/logger';

/** Interface que define a estrutura de search result. */
export interface SearchResult {
  path: string;
  score: number;
  chunk: string;
}

/**
 * Pesquisa documents.
 * @param docs - Valor docs.
 * @param query - Consulta query.
 * @param maxResults - Valor results.
 * @param filterExt - Filtra ext.
 * @returns O resultado da operação.
 */
export function searchDocuments(
  docs: IndexedDocument[],
  query: string,
  maxResults: number = 10,
  filterExt?: string
): SearchResult[] {
  const queryVector = generateTFIDFVector(query);

  let scored = docs.map(doc => ({
    path: doc.path,
    score: cosineSimilarity(queryVector, doc.vector),
    chunk: extractRelevantChunk(doc.content, query),
  }));

  if (filterExt) {
    scored = scored.filter(s => s.path.endsWith(filterExt));
  }

  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, maxResults);
}

/**
 * Busca similar documents.
 * @param docs - Valor docs.
 * @param targetPath - Valor path.
 * @param maxResults - Valor results.
 * @returns O resultado da operação.
 */
export function findSimilarDocuments(
  docs: IndexedDocument[],
  targetPath: string,
  maxResults: number = 5
): SearchResult[] {
  const target = docs.find(d => d.path === targetPath);
  if (!target) return [];

  const scored = docs
    .filter(d => d.path !== targetPath)
    .map(doc => ({
      path: doc.path,
      score: cosineSimilarity(target.vector, doc.vector),
      chunk: extractRelevantChunk(doc.content, targetPath),
    }));

  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, maxResults);
}
