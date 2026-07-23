import { DatabaseAdapter } from './types';

export interface VectorRecord {
  id: string;
  key: string;
  embedding: number[];
  content: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

export class VectorStore {
  private dimensions: number;
  private adapter: DatabaseAdapter;
  private ready = false;
  private isPostgres: boolean;

  constructor(adapter: DatabaseAdapter, dimensions = 384, isPostgres = false) {
    this.adapter = adapter;
    this.dimensions = dimensions;
    this.isPostgres = isPostgres;
  }

  async ensureSchema(): Promise<void> {
    const dims = this.dimensions;
    if (this.isPostgres) {
      await this.adapter.query(`
        CREATE EXTENSION IF NOT EXISTS vector;
        CREATE TABLE IF NOT EXISTS ideia_vectors (
          id UUID PRIMARY KEY,
          key TEXT UNIQUE NOT NULL,
          embedding vector(${dims}),
          content TEXT NOT NULL,
          metadata JSONB DEFAULT '{}',
          created_at TIMESTAMPTZ DEFAULT NOW()
        );
        CREATE INDEX IF NOT EXISTS idx_vectors_key ON ideia_vectors(key);
        CREATE INDEX IF NOT EXISTS idx_vectors_embedding ON ideia_vectors USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
      `);
    } else {
      await this.adapter.query(`
        CREATE TABLE IF NOT EXISTS ideia_vectors (
          id TEXT PRIMARY KEY,
          key TEXT UNIQUE NOT NULL,
          embedding TEXT,
          content TEXT NOT NULL,
          metadata TEXT DEFAULT '{}',
          created_at TEXT DEFAULT (datetime('now'))
        );
        CREATE INDEX IF NOT EXISTS idx_vectors_key ON ideia_vectors(key);
      `);
    }
    this.ready = true;
  }

  async insert(id: string, key: string, embedding: number[], content: string, metadata?: Record<string, unknown>): Promise<void> {
    if (this.isPostgres) {
      await this.adapter.query(
        'INSERT INTO ideia_vectors (id, key, embedding, content, metadata, created_at) VALUES ($1, $2, $3::vector, $4, $5::jsonb, NOW()) ON CONFLICT (key) DO UPDATE SET embedding = $3::vector, content = $4, metadata = $5::jsonb',
        [id, key, `[${embedding.join(',')}]`, content, JSON.stringify(metadata || {})]
      );
    } else {
      await this.adapter.query(
        'INSERT INTO ideia_vectors (id, key, embedding, content, metadata, created_at) VALUES (?, ?, ?, ?, ?, datetime(\'now\')) ON CONFLICT (key) DO UPDATE SET embedding = ?, content = ?, metadata = ?',
        [id, key, JSON.stringify(embedding), content, JSON.stringify(metadata || {}), JSON.stringify(embedding), content, JSON.stringify(metadata || {})]
      );
    }
  }

  async search(queryEmbedding: number[], limit = 10): Promise<VectorRecord[]> {
    if (this.isPostgres) {
      type SearchRow = { id: string; key: string; content: string; metadata: string; created_at: string; distance: number };
      const result = await this.adapter.query<SearchRow>(
        `SELECT id, key, content, metadata, created_at, embedding <=> $1::vector AS distance
         FROM ideia_vectors ORDER BY distance ASC LIMIT $2`,
        [`[${queryEmbedding.join(',')}]`, limit]
      );
      return result.rows.map(r => ({
        id: r.id,
        key: r.key,
        embedding: [],
        content: r.content,
        metadata: typeof r.metadata === 'string' ? JSON.parse(r.metadata) : r.metadata,
        createdAt: r.created_at as string,
      }));
    }

    const all = await this.adapter.query<{ id: string; key: string; embedding: string; content: string; metadata: string; created_at: string }>(
      'SELECT id, key, embedding, content, metadata, created_at FROM ideia_vectors'
    );
    const scored = all.rows.map(r => {
      const stored = JSON.parse(r.embedding) as number[];
      const score = cosineSimilarity(queryEmbedding, stored);
      return { r, score };
    });
    return scored.sort((a, b) => b.score - a.score).slice(0, limit).map(s => ({
      id: s.r.id,
      key: s.r.key,
      embedding: [],
      content: s.r.content,
      metadata: JSON.parse(s.r.metadata),
      createdAt: s.r.created_at,
    }));
  }

  async delete(key: string): Promise<void> {
    await this.adapter.query('DELETE FROM ideia_vectors WHERE key = ?', [key]);
  }

  async count(): Promise<number> {
    const result = await this.adapter.query<{ count: number }>('SELECT COUNT(*) AS count FROM ideia_vectors');
    return Number(result.rows[0]?.count || 0);
  }
}

function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0, magA = 0, magB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    magA += a[i] * a[i];
    magB += b[i] * b[i];
  }
  const denom = Math.sqrt(magA) * Math.sqrt(magB);
  return denom === 0 ? 0 : dot / denom;
}
