import fs from 'node:fs';
import path from 'node:path';

export interface RagDoc {
  id: string;
  path: string;
  content: string;
  chunkIndex: number;
  totalChunks: number;
  category: string;
  indexedAt: string;
}

export interface RagResult {
  doc: RagDoc;
  score: number;
}

export interface RagContext {
  results: RagResult[];
  source: 'vectors' | 'tfidf' | 'none';
}

export interface CitationInfo {
  filePath: string;
  fileName: string;
  snippet: string;
  relevanceScore: number;
}

export const RAG_VECTORS_DIR = '.ai/local-ai/rag';
export const VECTORS_FILE = 'vectors.json';

function findProjectRoot(): string | null {
  let dir = process.cwd();
  const root = path.parse(dir).root;
  while (dir !== root) {
    if (fs.existsSync(path.join(dir, '.ai'))) return dir;
    dir = path.dirname(dir);
  }
  return process.cwd();
}

function _loadVectors(root: string): RagDoc[] {
  const vectorsPath = path.join(root, RAG_VECTORS_DIR, VECTORS_FILE);
  if (!fs.existsSync(vectorsPath)) return [];
  try {
    const raw = fs.readFileSync(vectorsPath, 'utf8');
    return JSON.parse(raw) as RagDoc[];
  } catch {
    return [];
  }
}

function tokenize(text: string): string[] {
  return text.toLowerCase().split(/[^a-záéíóúãõç0-9]+/).filter(t => t.length > 2);
}

function buildTfIdfIndex(docs: RagDoc[]): Map<string, Map<number, number>> {
  const df = new Map<string, number>();
  const tfs: Map<string, number>[] = docs.map(doc => {
    const tokens = tokenize(doc.content);
    const tf = new Map<string, number>();
    const seen = new Set<string>();
    for (const t of tokens) {
      tf.set(t, (tf.get(t) || 0) + 1);
      if (!seen.has(t)) { seen.add(t); df.set(t, (df.get(t) || 0) + 1); }
    }
    for (const [k, v] of tf) tf.set(k, v / tokens.length);
    return tf;
  });
  const N = docs.length;
  const index = new Map<string, Map<number, number>>();
  for (let i = 0; i < docs.length; i++) {
    for (const [term, tf] of tfs[i]) {
      const idf = Math.log(1 + N / (1 + (df.get(term) || 0)));
      if (!index.has(term)) index.set(term, new Map());
      index.get(term) ?? {}.set(i, tf * idf);
    }
  }
  return index;
}

export function searchTfIdf(query: string, docs: RagDoc[], maxResults: number = 10): RagResult[] {
  const queryTokens = tokenize(query);
  if (queryTokens.length === 0) return [];

  const index = buildTfIdfIndex(docs);
  const scores = new Array(docs.length).fill(0);

  for (const qt of queryTokens) {
    const posting = index.get(qt);
    if (!posting) continue;
    for (const [docIdx, weight] of posting) {
      scores[docIdx] += weight;
    }
  }

  const queryNorm = Math.sqrt(queryTokens.length);
  const results: RagResult[] = scores
    .map((score, i) => ({ doc: docs[i], score: queryNorm > 0 ? score / queryNorm : 0 }))
    .filter(r => r.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, maxResults);

  return results;
}

export function searchWithRag(query: string, rootDir?: string, maxResults: number = 5): RagContext {
  const root = rootDir || findProjectRoot();
  if (!root) return { results: [], source: 'none' };

  const vectorsPath = path.resolve(root, RAG_VECTORS_DIR, VECTORS_FILE);
  if (!fs.existsSync(vectorsPath)) return { results: [], source: 'none' };

  let docs: RagDoc[];
  try {
    const raw = fs.readFileSync(vectorsPath, 'utf8');
    docs = JSON.parse(raw) as RagDoc[];
    if (!Array.isArray(docs) || docs.length === 0) return { results: [], source: 'none' };
  } catch {
    return { results: [], source: 'none' };
  }

  const results = searchTfIdf(query, docs, maxResults);
  return {
    results,
    source: results.length > 0 ? 'tfidf' : 'none',
  };
}

export function buildRagContext(input: string, maxResults: number = 3): string {
  const ctx = searchWithRag(input, undefined, maxResults);
  if (ctx.source === 'none' || ctx.results.length === 0) return '';

  const parts = ctx.results.map(r => {
    const header = `[${r.doc.category}] ${r.doc.path} (relevance: ${r.score.toFixed(3)})`;
    const snippet = r.doc.content.length > 300
      ? r.doc.content.slice(0, 300) + '...'
      : r.doc.content;
    return `${header}\n${snippet}`;
  });

  return parts.join('\n\n---\n\n');
}

export function buildRagEnhancedInput(input: string, maxResults: number = 3): string {
  const context = buildRagContext(input, maxResults);
  if (!context) return input;

  return `Project Context:\n${context}\n\n---\n\nTask: ${input}`;
}

export function extractCitations(context: string): CitationInfo[] {
  const ctx = searchWithRag(context, undefined, 5);
  return ctx.results.map(r => ({
    filePath: r.doc.path,
    fileName: path.basename(r.doc.path),
    snippet: r.doc.content.length > 200 ? r.doc.content.slice(0, 200) + '...' : r.doc.content,
    relevanceScore: Math.round(r.score * 100) / 100,
  }));
}

export function formatRagAnswer(question: string, contexts: RagResult[]): string {
  const contextBlock = contexts
    .map(c => `=== ${c.doc.path} (chunk ${c.doc.chunkIndex + 1}/${c.doc.totalChunks}, score: ${c.score.toFixed(3)}) ===\n${c.doc.content}`)
    .join('\n\n');

  return `You are an AI assistant with access to the project's documentation and source code.

Use the following context to answer the user's question. If the context doesn't contain enough information, say so.

<context>
${contextBlock}
</context>

Question: ${question}

Answer:`;
}

export function getRagStats(rootDir?: string): { totalDocs: number; categories: Record<string, number>; hasVectors: boolean } {
  const root = rootDir || findProjectRoot();
  if (!root) return { totalDocs: 0, categories: {}, hasVectors: false };
  const vectorsPath = path.resolve(root, RAG_VECTORS_DIR, VECTORS_FILE);
  if (!fs.existsSync(vectorsPath)) return { totalDocs: 0, categories: {}, hasVectors: false };
  try {
    const raw = fs.readFileSync(vectorsPath, 'utf8');
    const docs = JSON.parse(raw) as RagDoc[];
    if (!Array.isArray(docs)) return { totalDocs: 0, categories: {}, hasVectors: false };
    const categories: Record<string, number> = {};
    for (const d of docs) {
      categories[d.category] = (categories[d.category] || 0) + 1;
    }
    return { totalDocs: docs.length, categories, hasVectors: docs.length > 0 };
  } catch {
    return { totalDocs: 0, categories: {}, hasVectors: false };
  }
}
