import fs from 'node:fs';
import path from 'node:path';
import { chunkDirectory, setChunkerConfig } from './chunker';
import { generateNeuralEmbedding, generateBatchEmbeddings } from './embeddings';
import { DenseVectorDoc, addVectorDocs, searchVectors, getVectorStats, VectorSearchResult, getCachedResults, setCachedResults, loadVectors, clearCache, rebuildVectorIndex } from './vector-store';
import { getIndex, getIndexStatus } from './indexer';
import { FileMetadata, IndexState, loadIndexState, saveIndexState, isFileChanged, getCurrentFileMetadata } from './freshness';
import { rerank, RankedResult } from './reranker';
import { Citation, buildCitationsFromResults, buildPromptWithCitations, formatCitationsMd } from './citations';

/** Interface que define a estrutura de rag config. */
export interface RagConfig {
  chunkSize: number;
  chunkOverlap: number;
  embeddingModel: string;
  ollamaHost: string;
  maxResults: number;
  minScore: number;
  useCache: boolean;
  cacheTtlMs: number;
  usePartialReindex: boolean;
  rankingStrategy: 'hybrid' | 'semantic' | 'freshness' | 'lexical';
  semanticWeight: number;
  freshnessWeight: number;
  lexicalWeight: number;
}

export const DEFAULT_RAG_CONFIG: RagConfig = {
  chunkSize: 1000,
  chunkOverlap: 200,
  embeddingModel: 'nomic-embed-text',
  ollamaHost: 'http://localhost:11434',
  maxResults: 10,
  minScore: 0.0,
  useCache: true,
  cacheTtlMs: 5 * 60 * 1000,
  usePartialReindex: true,
  rankingStrategy: 'hybrid',
  semanticWeight: 0.5,
  freshnessWeight: 0.25,
  lexicalWeight: 0.25,
};

/** Interface que define a estrutura de ingest result. */
export interface IngestResult {
  filesProcessed: number;
  chunksIndexed: number;
  errors: number;
  skipped: number;
}

function inferCategory(filePath: string): string {
  const dir = path.dirname(filePath);
  const parts = dir.split(path.sep);
  for (const part of parts) {
    const lower = part.toLowerCase();
    if (lower === 'src' || lower === 'packages') return 'source';
    if (lower === 'docs' || lower === 'doc' || lower === '.ai') return 'documentation';
    if (lower === 'tests' || lower === '__tests__') return 'tests';
    if (lower === 'config' || lower === 'scripts') return lower;
  }
  return 'other';
}

/**
 * Processa directory.
 * @param root - Valor root.
 * @param dirs - Valor dirs.
 * @param configOverrides - Valor overrides.
 * @returns Promessa resolvida com o resultado da operação.
 */
export async function ingestDirectory(
  root: string,
  dirs: string[],
  configOverrides?: Partial<RagConfig>
): Promise<IngestResult> {
  const config = { ...DEFAULT_RAG_CONFIG, ...configOverrides };
  const chunkerConfig = setChunkerConfig({
    chunkSize: config.chunkSize,
    chunkOverlap: config.chunkOverlap,
  });

  const exts = new Set(['.ts', '.js', '.md', '.yaml', '.yml', '.json', '.py', '.go', '.rs', '.sh', '.ps1', '.bat']);
  const ignoreDirs = new Set(['node_modules', '.git', 'dist', 'coverage', '.venv', '__pycache__']);

  const indexState = config.usePartialReindex ? loadIndexState(root) : null;
  let filesProcessed = 0;
  let chunksIndexed = 0;
  let errors = 0;
  let skipped = 0;

  for (const dir of dirs) {
    const fullDir = path.join(root, dir);
    if (!fs.existsSync(fullDir)) continue;

    const chunks = chunkDirectory(fullDir, exts, ignoreDirs, chunkerConfig);

    const uniqueFiles = new Set(chunks.map((c) => c.path));
    const changedFiles = new Set<string>();

    if (config.usePartialReindex && indexState) {
      for (const filePath of uniqueFiles) {
        if (isFileChanged(root, filePath)) {
          changedFiles.add(filePath);
        } else {
          skipped++;
        }
      }
      filesProcessed += changedFiles.size;
    } else {
      filesProcessed += uniqueFiles.size;
    }

    const filterChanged = config.usePartialReindex
      ? chunks.filter((c) => changedFiles.has(c.path))
      : chunks;

    if (filterChanged.length === 0) {
      skipped += chunks.length;
      continue;
    }

    try {
      const embeddings = await generateBatchEmbeddings(
        filterChanged.map((c) => c.content),
        { model: config.embeddingModel, ollamaHost: config.ollamaHost, batchSize: 10 }
      );

      const docs: DenseVectorDoc[] = filterChanged.map((chunk, i) => {
        let mtimeMs = 0;
        let fileSize = 0;
        let fileHash = '';
        try {
          const stat = fs.statSync(chunk.path);
          mtimeMs = stat.mtimeMs;
          fileSize = stat.size;
          const content = fs.readFileSync(chunk.path, 'utf8');
          const cryptoMod = require('node:crypto') as typeof import('node:crypto');
          fileHash = cryptoMod.createHash('sha256').update(content).digest('hex').slice(0, 16);
        } catch {}
        return {
          id: chunk.id,
          path: chunk.path,
          content: chunk.content,
          chunkIndex: chunk.index,
          totalChunks: chunk.totalChunks,
          startOffset: chunk.startOffset,
          endOffset: chunk.endOffset,
          vector: embeddings[i]!.vector,
          model: config.embeddingModel,
          dimensions: embeddings[i]!.dimensions,
          indexedAt: new Date().toISOString(),
          mtimeMs,
          fileSize,
          fileHash,
          category: inferCategory(chunk.path),
        };
      });

      if (config.usePartialReindex) {
        const existing = loadVectors(root);
        const changedPaths = new Set(docs.map((d) => d.path));
        const filtered = existing.filter((d) => !changedPaths.has(d.path));
        addVectorDocs(root, docs as DenseVectorDoc[]);
        const allDocs = [...filtered, ...docs];
        const { saveVectors } = require('./vector-store') as typeof import('./vector-store');
        saveVectors(root, allDocs);
      } else {
        addVectorDocs(root, docs as DenseVectorDoc[]);
      }
      chunksIndexed += docs.length;
    } catch (_err) {
      errors++;
      console.error(`[rag] Embedding error for ${dir}:`, err instanceof Error ? err.message : String(err));
    }
  }

  if (config.usePartialReindex && indexState) {
    const updatedState: IndexState = {
      files: {},
      lastIndexedAt: new Date().toISOString(),
    };
    for (const filePath of Array.from(new Set([...dirs.flatMap((d) => {
      const fullDir = path.join(root, d);
      if (!fs.existsSync(fullDir)) return [];
      return chunkDirectory(fullDir, exts, ignoreDirs, chunkerConfig).map((c) => c.path);
    })]))) {
      const meta = getCurrentFileMetadata(filePath);
      if (meta) updatedState.files[filePath] = meta;
    }
    saveIndexState(root, updatedState);
  }

  try {
    rebuildVectorIndex(root);
  } catch (_idxErr) {
    console.error('[rag] Index rebuild error:', idxErr instanceof Error ? idxErr.message : String(idxErr));
  }

  return { filesProcessed, chunksIndexed, errors, skipped };
}

/** Interface que define a estrutura de rag search result. */
export interface RagSearchResult extends VectorSearchResult {
  context: string;
  citation: Citation;
}

/**
 * Pesquisa search.
 * @param root - Valor root.
 * @param query - Consulta query.
 * @param configOverrides - Valor overrides.
 * @returns Promessa resolvida com o resultado da operação.
 */
export async function search(
  root: string,
  query: string,
  configOverrides?: Partial<RagConfig>
): Promise<RagSearchResult[]> {
  const config = { ...DEFAULT_RAG_CONFIG, ...configOverrides };

  if (config.useCache) {
    const cached = getCachedResults(root, query);
    if (cached) {
      return cached.map((r) => ({
        ...r,
        context: formatContext(r.doc),
        citation: buildCitationStatic(r.doc, r.score),
      }));
    }
  }

  const queryTerms = query.toLowerCase().split(/\s+/).filter((w) => w.length > 2);

  try {
    const queryEmbed = await generateNeuralEmbedding(query, {
      model: config.embeddingModel,
      ollamaHost: config.ollamaHost,
    });

    const denseResults = searchVectors(root, queryEmbed.vector, config.maxResults, config.minScore);

    const docs = denseResults.map((r) => r.doc);
    const ranked = rerank(docs, queryEmbed.vector, queryTerms, {
      strategy: config.rankingStrategy,
      semanticWeight: config.semanticWeight,
      freshnessWeight: config.freshnessWeight,
      lexicalWeight: config.lexicalWeight,
    });

    const results: RagSearchResult[] = ranked.slice(0, config.maxResults).map((r) => ({
      doc: r.doc,
      score: r.hybridScore,
      context: formatContext(r.doc),
      citation: buildCitationFromRanked(r),
    }));

    if (config.useCache) {
      const dominantCategory = docs.length > 0 ? docs[0]!.category : undefined;
      setCachedResults(root, query, results, config.cacheTtlMs, dominantCategory);
    }
    return results;
  } catch {
    const fallbackResults = await fallbackSearch(root, query, config.maxResults);
    return fallbackResults;
  }
}

function buildCitationStatic(doc: DenseVectorDoc, score: number): Citation {
  return {
    filePath: doc.path,
    fileName: path.basename(doc.path),
    chunkIndex: doc.chunkIndex,
    totalChunks: doc.totalChunks,
    snippet: doc.content.length > 200 ? doc.content.slice(0, 200) + '...' : doc.content,
    relevanceScore: Math.round(score * 100) / 100,
    source: 'dense',
    indexedAt: doc.indexedAt,
  };
}

function buildCitationFromRanked(r: RankedResult): Citation {
  return {
    filePath: r.doc.path,
    fileName: path.basename(r.doc.path),
    chunkIndex: r.doc.chunkIndex,
    totalChunks: r.doc.totalChunks,
    snippet: r.doc.content.length > 200 ? r.doc.content.slice(0, 200) + '...' : r.doc.content,
    relevanceScore: Math.round(r.hybridScore * 100) / 100,
    source: 'hybrid',
    indexedAt: r.doc.indexedAt,
  };
}

function formatContext(doc: DenseVectorDoc): string {
  const header = `=== ${doc.path} (chunk ${doc.chunkIndex + 1}/${doc.totalChunks}) ===`;
  return `${header}\n${doc.content}\n`;
}

async function fallbackSearch(
  root: string,
  query: string,
  maxResults: number
): Promise<RagSearchResult[]> {
  const { searchDocuments } = await import('./searcher');
  const docs = getIndex(root);
  const results = searchDocuments(docs, query, maxResults);

  return results.map((r) => ({
    doc: {
      id: r.path,
      path: r.path,
      content: r.chunk,
      chunkIndex: 0,
      totalChunks: 1,
      startOffset: 0,
      endOffset: r.chunk.length,
      vector: [],
      model: 'tfidf-fallback',
      dimensions: 0,
      indexedAt: '',
      mtimeMs: 0,
      fileSize: 0,
      fileHash: '',
      category: 'other',
    },
    score: r.score,
    context: r.chunk,
    citation: {
      filePath: r.path,
      fileName: path.basename(r.path),
      chunkIndex: 0,
      totalChunks: 1,
      snippet: r.chunk.length > 200 ? r.chunk.slice(0, 200) + '...' : r.chunk,
      relevanceScore: Math.round(r.score * 100) / 100,
      source: 'tfidf',
      indexedAt: '',
    },
  }));
}

/**
 * Constrói rag prompt.
 * @param question - Valor question.
 * @param contexts - Valor contexts.
 * @returns O resultado da operação.
 */
export function buildRagPrompt(question: string, contexts: RagSearchResult[]): string {
  const citations = contexts.map((c) => c.citation);
  return buildPromptWithCitations(question, citations);
}

/**
 * Formata plain prompt.
 * @param question - Valor question.
 * @param contexts - Valor contexts.
 * @returns O resultado da operação.
 */
export function formatPlainPrompt(question: string, contexts: RagSearchResult[]): string {
  const contextBlock = contexts
    .map((c) => c.context)
    .join('\n\n');

  return `You are an AI assistant with access to the project's documentation and source code.

Use the following context to answer the user's question. If the context doesn't contain enough information, say so.

<context>
${contextBlock}
</context>

Question: ${question}

Answer:`;
}

/**
 * Obtém rag stats.
 * @param root - Valor root.
 * @returns O resultado da operação.
 */
export function getRagStats(root: string): {
  dense: { total: number; dimensions: number; model: string };
  tfidf: { total: number; fileCount: number };
  index: { built: boolean; numClusters: number; totalDocs: number; avgDocsPerCluster: number; builtAt: string };
} {
  const dense = getVectorStats(root);
  const tfidf = getIndexStatus(root);
  let indexStats = { built: false, numClusters: 0, totalDocs: 0, avgDocsPerCluster: 0, builtAt: '' };
  try {
    const { loadIndex, getIndexStats } = require('./vector-index') as typeof import('./vector-index');
    const idx = loadIndex(root);
    indexStats = getIndexStats(idx);
  } catch {}
  return { dense, tfidf, index: indexStats };
}
