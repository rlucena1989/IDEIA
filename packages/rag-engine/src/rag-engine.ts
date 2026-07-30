import path from 'path';
import { createLogger } from '@ideia/logger';
import { VectorSearch } from '@ideia/memory-store';
import type { EmbeddingProvider, SearchResult as VectorSearchResult } from '@ideia/memory-store';
import type { LLMProvider } from '@ideia/llm-provider';
import { DocIndexer } from './doc-indexer';
import {
  Chunk,
  Citation,
  SearchResult,
  RagConfig,
  RagStats,
  SearchFilter,
  IndexOptions,
  DEFAULT_RAG_CONFIG,
  Document,
  DocumentCategory,
  DocumentSource,
} from './types';
const logger = createLogger('rag-engine');

function keywordScore(query: string, content: string): number {
  const qTokens = query.toLowerCase().split(/\W+/).filter(Boolean);
  const cTokens = new Set(content.toLowerCase().split(/\W+/).filter(Boolean));
  if (qTokens.length === 0) return 0;
  let matches = 0;
  for (const t of qTokens) {
    if (cTokens.has(t)) matches++;
  }
  return matches / qTokens.length;
}

function mmrDiversity(
  results: Array<{ chunk: Chunk; score: number; vector: number[] }>,
  topK: number,
  lambda: number
): Array<{ chunk: Chunk; score: number; vector: number[] }> {
  if (results.length <= topK) return results;

  const selected: Array<{ chunk: Chunk; score: number; vector: number[] }> = [];
  const remaining = [...results];

  while (selected.length < topK && remaining.length > 0) {
    let bestIdx = 0;
    let bestScore = -Infinity;

    for (let i = 0; i < remaining.length; i++) {
      const r = remaining[i];
      let maxSim = 0;
      for (const s of selected) {
        const sim = cosineSimilarity(r.vector, s.vector);
        if (sim > maxSim) maxSim = sim;
      }
      const mmrScore = lambda * r.score - (1 - lambda) * maxSim;
      if (mmrScore > bestScore) {
        bestScore = mmrScore;
        bestIdx = i;
      }
    }

    selected.push(remaining[bestIdx]);
    remaining.splice(bestIdx, 1);
  }

  return selected;
}

function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) return 0;
  let dot = 0, normA = 0, normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  const denom = Math.sqrt(normA) * Math.sqrt(normB);
  return denom === 0 ? 0 : dot / denom;
}

function buildCitation(chunk: Chunk, score: number, source: DocumentSource, category: DocumentCategory): Citation {
  return {
    filePath: chunk.path,
    fileName: path.basename(chunk.path),
    chunkIndex: chunk.index,
    totalChunks: chunk.totalChunks,
    snippet: chunk.content.length > 200 ? chunk.content.slice(0, 200) + '...' : chunk.content,
    relevanceScore: Math.round(score * 100) / 100,
    source,
    category,
  };
}

export class LLMProviderEmbeddingAdapter implements EmbeddingProvider {
  readonly dimensions: number;
  private llmProvider: LLMProvider;
  private model: string;

  constructor(llmProvider: LLMProvider, model?: string, dimensions?: number) {
    this.llmProvider = llmProvider;
    this.model = model ?? 'nomic-embed-text';
    this.dimensions = dimensions ?? 768;
  }

  async embed(text: string): Promise<number[]> {
    const response = await this.llmProvider.embed({ model: this.model, input: text });
    if (response.embeddings.length === 0 || !response.embeddings[0]) {
      throw new Error('LLMProvider returned empty embeddings');
    }
    return response.embeddings[0];
  }
}

export class RagEngine {
  private vectorSearch: VectorSearch;
  private docIndexer: DocIndexer;
  private config: RagConfig;
  private indexBuiltAt: string = '';
  private indexedPaths: string[] = [];

  constructor(
    embedder?: EmbeddingProvider,
    config?: Partial<RagConfig>,
    vectorSearch?: VectorSearch
  ) {
    this.config = { ...DEFAULT_RAG_CONFIG, ...config };
    this.vectorSearch = vectorSearch ?? new VectorSearch(embedder?.dimensions ?? 384, embedder);
    if (embedder) {
      this.vectorSearch.setEmbedder(embedder);
    }
    this.docIndexer = new DocIndexer();
  }

  get stats(): RagStats {
    return {
      totalDocuments: this.docIndexer.documentCount,
      totalChunks: this.vectorSearch.size,
      indexedPaths: [...this.indexedPaths],
      indexBuiltAt: this.indexBuiltAt,
      indexSizeBytes: 0,
    };
  }

  setConfig(config: Partial<RagConfig>): void {
    this.config = { ...this.config, ...config };
  }

  async indexDocs(
    docsDir: string,
    sourceDir: string,
    options?: IndexOptions
  ): Promise<{ documents: number; chunks: number }> {
    this.indexedPaths = [];
    this.indexBuiltAt = '';

    const result = this.docIndexer.indexDirectory(docsDir, options);
    if (sourceDir && sourceDir !== docsDir) {
      const srcResult = this.docIndexer.indexDirectory(sourceDir, { ...options, reindex: false });
      result.documents += srcResult.documents;
      result.chunks += srcResult.chunks;
    }

    const chunks = this.docIndexer.getChunks();
    const documents = this.docIndexer.getDocuments();
    const docMap = new Map<string, Document>();
    for (const doc of documents) {
      const key = path.basename(doc.path);
      docMap.set(key, doc);
    }

    for (const chunk of chunks) {
      const doc = docMap.get(path.basename(chunk.path));
      await this.vectorSearch.addAsync(chunk.content, {
        path: chunk.path,
        chunkIndex: chunk.index,
        totalChunks: chunk.totalChunks,
        source: doc?.source ?? 'other',
        category: doc?.category ?? 'general',
      });
    }

    void this.vectorSearch.size;

    this.indexBuiltAt = new Date().toISOString();
    this.indexedPaths = [docsDir];
    if (sourceDir && sourceDir !== docsDir) {
      this.indexedPaths.push(sourceDir);
    }

    return { documents: result.documents, chunks: result.chunks };
  }

  async query(queryText: string, filter?: SearchFilter): Promise<SearchResult[]> {
    const maxResults = filter?.maxResults ?? this.config.maxResults;
    const minScore = filter?.minScore ?? this.config.minScore;
    const topK = Math.max(maxResults * 3, 20);

    const results = await this.vectorSearch.searchAsync(queryText, topK, {
      minScore,
      filter: filter ? (m) => this.applyFilter(m, filter) : undefined,
    });

    const enriched = this.enrichResults(results, queryText);
    const reranked = this.config.rerankEnable
      ? mmrDiversity(enriched, maxResults, this.config.rerankDiversity)
      : enriched.slice(0, maxResults);

    return reranked.map((r) => ({
      chunk: r.chunk,
      score: r.score,
      semanticScore: r.score * this.config.semanticWeight,
      keywordScore: keywordScore(queryText, r.chunk.content),
      citation: buildCitation(
        r.chunk,
        r.score,
        (r.chunk.metadata.source as DocumentSource) ?? 'other',
        (r.chunk.metadata.category as DocumentCategory) ?? 'general'
      ),
    }));
  }

  private applyFilter(metadata: Record<string, unknown>, filter: SearchFilter): boolean {
    if (filter.source && filter.source.length > 0) {
      const src = metadata.source as string | undefined;
      if (!src || !filter.source.includes(src as DocumentSource)) return false;
    }
    if (filter.category && filter.category.length > 0) {
      const cat = metadata.category as string | undefined;
      if (!cat || !filter.category.includes(cat as DocumentCategory)) return false;
    }
    if (filter.pathPattern) {
      const filePath = metadata.path as string | undefined;
      if (!filePath || !filePath.toLowerCase().includes(filter.pathPattern.toLowerCase())) return false;
    }
    return true;
  }

  private enrichResults(
    vectorResults: VectorSearchResult[],
    queryText: string
  ): Array<{ chunk: Chunk; score: number; vector: number[] }> {
    return vectorResults.map((vr) => {
      const rec = vr.record;
      const meta = rec.metadata;
      const kw = keywordScore(queryText, rec.content);
      const combined = vr.score * this.config.semanticWeight + kw * this.config.keywordWeight;

      const chunk: Chunk = {
        id: rec.id,
        path: (meta.path as string) ?? 'unknown',
        content: rec.content,
        index: (meta.chunkIndex as number) ?? 0,
        totalChunks: (meta.totalChunks as number) ?? 1,
        startOffset: 0,
        endOffset: rec.content.length,
        metadata: Object.fromEntries(
          Object.entries(meta).map(([k, v]) => [k, String(v ?? '')])
        ),
      };

      return { chunk, score: combined, vector: rec.vector };
    });
  }

  clear(): void {
    this.vectorSearch.clear();
    this.docIndexer.clear();
    this.indexBuiltAt = '';
    this.indexedPaths = [];
  }
}
