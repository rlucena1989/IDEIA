import { randomUUID } from 'crypto';
import { createLogger } from '@ideia/logger';
import fs from 'fs';
import path from 'path';

export interface VectorRecord {
  id: string;
  vector: number[];
  metadata: Record<string, unknown>;
  content: string;
  createdAt: string;
}

export interface EmbeddingConfig {
  apiKey?: string;
  baseUrl?: string;
  model?: string;
  dimensions?: number;
  timeout?: number;
}

export interface SearchResult {
  record: VectorRecord;
  score: number;
}

export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) return 0;
  let dot = 0, normA = 0, normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += (a[i] ?? 0) * (b[i] ?? 0);
    normA += (a[i] ?? 0) * (a[i] ?? 0);
    normB += (b[i] ?? 0) * (b[i] ?? 0);
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
  const qt = tokenize(query);
  const ct = tokenize(content);
  if (qt.size === 0) return 0;
  let matches = 0;
  for (const t of qt) { if (ct.has(t)) matches++; }
  return matches / qt.size;
}

export interface EmbeddingProvider {
  embed(text: string): Promise<number[]>;
  readonly dimensions: number;
}

export class OllamaEmbeddingProvider implements EmbeddingProvider {
  readonly dimensions: number;
  private baseUrl: string;
  private model: string;
  private timeout: number;

  constructor(config: EmbeddingConfig = {}) {
    this.baseUrl = config.baseUrl ?? 'http://127.0.0.1:11434';
    this.model = config.model ?? 'nomic-embed-text';
    this.dimensions = config.dimensions ?? 768;
    this.timeout = config.timeout ?? 30000;
  }

  async embed(text: string): Promise<number[]> {
    const response = await fetch(`${this.baseUrl}/api/embed`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: this.model, input: [text] }),
      signal: AbortSignal.timeout(this.timeout),
    });
    if (!response.ok) throw new Error(`Ollama embed failed: ${response.statusText}`);
    const data = await response.json() as { embeddings?: number[][] };
    if (!data.embeddings?.[0]) throw new Error('Ollama returned empty embeddings');
    return data.embeddings[0];
  }
}

export class OpenAIEmbeddingProvider implements EmbeddingProvider {
  readonly dimensions: number;
  private apiKey: string;
  private baseUrl: string;
  private model: string;
  private timeout: number;

  constructor(config: EmbeddingConfig = {}) {
    this.apiKey = config.apiKey ?? process.env.OPENAI_API_KEY ?? '';
    this.baseUrl = config.baseUrl ?? 'https://api.openai.com/v1';
    this.model = config.model ?? 'text-embedding-3-small';
    this.dimensions = config.dimensions ?? 1536;
    this.timeout = config.timeout ?? 30000;
  }

  async embed(text: string): Promise<number[]> {
    const response = await fetch(`${this.baseUrl}/embeddings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({ model: this.model, input: text }),
      signal: AbortSignal.timeout(this.timeout),
    });
    if (!response.ok) throw new Error(`OpenAI embed failed: ${response.statusText}`);
    const data = await response.json() as { data?: Array<{ embedding: number[] }> };
    if (!data.data?.[0]?.embedding) throw new Error('OpenAI returned empty embeddings');
    return data.data[0].embedding;
  }
}

export class VectorSearch {
  private records: VectorRecord[] = [];
  private index: Map<string, VectorRecord> = new Map();
  private dimensions: number;
  private embedder?: EmbeddingProvider;

  constructor(dimensions = 384, embedder?: EmbeddingProvider) {
    this.dimensions = dimensions;
    this.embedder = embedder;
  }

  setEmbedder(embedder: EmbeddingProvider): void { this.embedder = embedder; this.dimensions = embedder.dimensions; }
  get embedderName(): string { return this.embedder ? 'configured' : 'none'; }

  get size(): number { return this.records.length; }
  getDimensions(): number { return this.dimensions; }

  async addAsync(content: string, metadata?: Record<string, unknown>, vector?: number[]): Promise<VectorRecord> {
    let v = vector;
    if (!v && this.embedder) {
      v = await this.embedder.embed(content);
    }
    return this.add(content, metadata, v);
  }

  add(content: string, metadata?: Record<string, unknown>, vector?: number[]): VectorRecord {
    const v = vector ?? new Array(this.dimensions).fill(0);
    if (v.length !== this.dimensions && vector) {
      throw new Error(`Vector dimension mismatch: expected ${this.dimensions}, got ${v.length}`);
    }
    const doc: VectorRecord = {
      id: randomUUID(),
      vector: normalizeVector(v),
      metadata: metadata ?? {},
      content,
      createdAt: new Date().toISOString(),
    };
    this.records.push(doc);
    this.index.set(doc.id, doc);
    return doc;
  }

  search(query: string | number[], topK = 10, options?: { minScore?: number; filter?: (m: Record<string, unknown>) => boolean }): SearchResult[] {
    const qv = Array.isArray(query) ? normalizeVector(query) : new Array(this.dimensions).fill(0);
    const minScore = options?.minScore ?? 0;
    const filter = options?.filter;
    const results: SearchResult[] = [];

    for (const record of this.records) {
      if (filter && !filter(record.metadata)) continue;
      const semantic = cosineSimilarity(qv, record.vector);
      const kw = typeof query === 'string' ? keywordScore(query, record.content) : 0;
      const score = semantic * 0.7 + kw * 0.3;
      if (score >= minScore) results.push({ record, score });
    }

    return results.sort((a, b) => b.score - a.score).slice(0, topK);
  }

  async searchAsync(query: string, topK = 10, options?: { minScore?: number; filter?: (m: Record<string, unknown>) => boolean }): Promise<SearchResult[]> {
    let qv: number[];
    if (this.embedder) {
      qv = normalizeVector(await this.embedder.embed(query));
    } else {
      qv = new Array(this.dimensions).fill(0);
    }
    const minScore = options?.minScore ?? 0;
    const filter = options?.filter;
    const results: SearchResult[] = [];

    for (const record of this.records) {
      if (filter && !filter(record.metadata)) continue;
      const semantic = cosineSimilarity(qv, record.vector);
      const kw = keywordScore(query, record.content);
      const score = semantic * 0.7 + kw * 0.3;
      if (score >= minScore) results.push({ record, score });
    }

    return results.sort((a, b) => b.score - a.score).slice(0, topK);
  }

  get(id: string): VectorRecord | undefined { return this.index.get(id); }
  delete(id: string): boolean {
    const idx = this.records.findIndex(r => r.id === id);
    if (idx === -1) return false;
    this.records.splice(idx, 1);
    this.index.delete(id);
    return true;
  }
  clear(): void { this.records = []; this.index.clear(); }

  serialize(): string {
    return JSON.stringify({
      dimensions: this.dimensions,
      records: this.records,
    });
  }

  saveToFile(filePath: string): void {
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(filePath, this.serialize(), 'utf-8');
  }

  static loadFromFile(filePath: string, embedder?: EmbeddingProvider): VectorSearch {
    if (!fs.existsSync(filePath)) return new VectorSearch(384, embedder);
    try {
      const raw = fs.readFileSync(filePath, 'utf-8');
      const data = JSON.parse(raw);
      const vs = new VectorSearch(data.dimensions || 384, embedder);
      for (const r of (data.records || [])) {
        vs.records.push(r);
        vs.index.set(r.id, r);
      }
      return vs;
    } catch {
      return new VectorSearch(384, embedder);
    }
  }

  static fromJSON(data: { records: VectorRecord[]; dimensions: number }, embedder?: EmbeddingProvider): VectorSearch {
    const vs = new VectorSearch(data.dimensions || 384, embedder);
    for (const r of (data.records || [])) {
      vs.records.push(r);
      vs.index.set(r.id, r);
    }
    return vs;
  }
}

export function createVectorSearch(dimensions?: number): VectorSearch {
  return new VectorSearch(dimensions);
}
