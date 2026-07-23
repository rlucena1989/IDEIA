import { randomUUID } from 'crypto';

export interface VectorRecord {
  id: string;
  vector: number[];
  metadata: Record<string, unknown>;
  content: string;
  createdAt: string;
}

export interface SearchResult {
  record: VectorRecord;
  score: number;
}

export interface EmbeddingProvider {
  embed(text: string | string[]): Promise<number[][]>;
  readonly dimensions: number;
  readonly name: string;
}

export function cosineSimilarity(a: number[], b: number[]): number {
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

export function normalizeVector(v: number[]): number[] {
  const norm = Math.sqrt(v.reduce((s, x) => s + x * x, 0));
  return norm === 0 ? v : v.map(x => x / norm);
}

function tokenize(text: string): Set<string> {
  return new Set(text.toLowerCase().split(/\W+/).filter(Boolean));
}

function keywordScore(query: string, content: string): number {
  const queryTokens = tokenize(query);
  const contentTokens = tokenize(content);
  if (queryTokens.size === 0) return 0;
  let matches = 0;
  for (const qt of queryTokens) {
    if (contentTokens.has(qt)) matches++;
  }
  return matches / queryTokens.size;
}

export class InMemoryVectorStore {
  private records: VectorRecord[] = [];
  private index: Map<string, VectorRecord> = new Map();
  private dimensions: number;
  private embeddingProvider?: EmbeddingProvider;

  constructor(embeddingProvider?: EmbeddingProvider, dimensions = 384) {
    this.embeddingProvider = embeddingProvider;
    this.dimensions = dimensions;
  }

  setEmbeddingProvider(provider: EmbeddingProvider): void {
    this.embeddingProvider = provider;
    this.dimensions = provider.dimensions;
  }

  get size(): number { return this.records.length; }

  getDimensions(): number { return this.dimensions; }

  getProviderName(): string { return this.embeddingProvider?.name ?? 'none'; }

  async add(record: { content: string; metadata?: Record<string, unknown>; vector?: number[] }): Promise<VectorRecord> {
    let vector = record.vector;

    if (!vector && this.embeddingProvider) {
      const embeddings = await this.embeddingProvider.embed(record.content);
      vector = embeddings[0];
    }

    if (!vector) {
      vector = new Array(this.dimensions).fill(0);
    }

    if (vector.length !== this.dimensions) {
      throw new Error(`Vector dimension mismatch: expected ${this.dimensions}, got ${vector.length}`);
    }

    const doc: VectorRecord = {
      id: randomUUID(),
      vector: normalizeVector(vector),
      metadata: record.metadata ?? {},
      content: record.content,
      createdAt: new Date().toISOString(),
    };

    this.records.push(doc);
    this.index.set(doc.id, doc);
    return doc;
  }

  async addMany(records: Array<{ content: string; metadata?: Record<string, unknown>; vector?: number[] }>): Promise<VectorRecord[]> {
    const results: VectorRecord[] = [];
    for (const record of records) {
      results.push(await this.add(record));
    }
    return results;
  }

  search(query: string | number[], topK = 10, options?: { minScore?: number; filter?: (m: Record<string, unknown>) => boolean }): SearchResult[] {
    const queryVector = typeof query === 'string' ? this.textToVector(query) : normalizeVector(query);
    const minScore = options?.minScore ?? 0;
    const filter = options?.filter;

    const scored: SearchResult[] = [];

    for (const record of this.records) {
      if (filter && !filter(record.metadata)) continue;
      const semanticScore = cosineSimilarity(queryVector, record.vector);
      const kwScore = typeof query === 'string' ? keywordScore(query, record.content) : 0;
      const score = semanticScore * 0.7 + kwScore * 0.3;

      if (score >= minScore) {
        scored.push({ record, score });
      }
    }

    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, topK);
  }

  get(id: string): VectorRecord | undefined {
    return this.index.get(id);
  }

  delete(id: string): boolean {
    const idx = this.records.findIndex(r => r.id === id);
    if (idx === -1) return false;
    this.records.splice(idx, 1);
    this.index.delete(id);
    return true;
  }

  clear(): void {
    this.records = [];
    this.index.clear();
  }

  toJSON(): { records: VectorRecord[]; dimensions: number } {
    return { records: [...this.records], dimensions: this.dimensions };
  }

  static fromJSON(data: { records: VectorRecord[]; dimensions: number }, provider?: EmbeddingProvider): InMemoryVectorStore {
    const store = new InMemoryVectorStore(provider, data.dimensions);
    store.records = [...data.records];
    for (const r of store.records) {
      store.index.set(r.id, r);
    }
    return store;
  }

  private textToVector(_text: string): number[] {
    if (this.embeddingProvider) {
      return new Array(this.dimensions).fill(0);
    }
    return new Array(this.dimensions).fill(0);
  }
}

export class SemanticMemorySearch {
  private vectorStore: InMemoryVectorStore;

  constructor(provider?: EmbeddingProvider, dimensions?: number) {
    this.vectorStore = new InMemoryVectorStore(provider, dimensions);
  }

  getVectorStore(): InMemoryVectorStore { return this.vectorStore; }

  async indexMemoryRecords(records: Array<{ content: string; category: string; tags: string[]; id?: string }>): Promise<void> {
    const entries = records.map(r => ({
      content: r.content,
      metadata: { category: r.category, tags: r.tags.join(','), originalId: r.id ?? randomUUID() },
    }));
    await this.vectorStore.addMany(entries);
  }

  hybridSearch(query: string, topK = 10, options?: { category?: string; minScore?: number }): SearchResult[] {
    const filter = options?.category
      ? (m: Record<string, unknown>) => m.category === options.category
      : undefined;
    return this.vectorStore.search(query, topK, { minScore: options?.minScore ?? 0.1, filter });
  }

  toJSON() { return this.vectorStore.toJSON(); }
  static fromJSON(data: ReturnType<InMemoryVectorStore['toJSON']>, provider?: EmbeddingProvider): SemanticMemorySearch {
    const search = new SemanticMemorySearch(provider);
    search.vectorStore = InMemoryVectorStore.fromJSON(data, provider);
    return search;
  }
}

export function createVectorStore(provider?: EmbeddingProvider): InMemoryVectorStore {
  return new InMemoryVectorStore(provider);
}

export function createSemanticSearch(provider?: EmbeddingProvider): SemanticMemorySearch {
  return new SemanticMemorySearch(provider);
}
