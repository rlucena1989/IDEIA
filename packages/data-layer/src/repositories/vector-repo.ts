import { BaseRepository } from './base-repo';

export interface VectorRecord {
  id: string;
  key: string;
  embedding?: number[];
  content: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

export interface VectorSearchResult extends VectorRecord {
  distance: number;
}

export class VectorRepository extends BaseRepository {
  async ensureTable(dimensions = 384): Promise<void> {
    if (this.dbType === 'postgres') {
      await this.adapter.query('CREATE EXTENSION IF NOT EXISTS vector');
      await this.adapter.query(`
        CREATE TABLE IF NOT EXISTS ideia_vectors (
          id UUID PRIMARY KEY,
          key TEXT UNIQUE NOT NULL,
          embedding vector(${dimensions}),
          content TEXT NOT NULL,
          metadata JSONB DEFAULT '{}',
          created_at TIMESTAMPTZ DEFAULT NOW()
        );
        CREATE INDEX IF NOT EXISTS idx_vectors_key ON ideia_vectors(key);
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
  }

  async ensureIndex(): Promise<void> {
    if (this.dbType !== 'postgres') return;
    await this.adapter.query(`
      CREATE INDEX IF NOT EXISTS idx_vectors_embedding
      ON ideia_vectors USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100)
    `);
  }

  async insert(record: VectorRecord): Promise<void> {
    if (this.dbType === 'postgres' && record.embedding) {
      await this.adapter.query(
        `INSERT INTO ideia_vectors (id, key, embedding, content, metadata, created_at)
         VALUES (${this.ph(0)}, ${this.ph(1)}, ${this.ph(2)}::vector, ${this.ph(3)}, ${this.ph(4)}::jsonb, ${this.now()})
         ON CONFLICT (key) DO UPDATE SET embedding = ${this.ph(2)}::vector, content = ${this.ph(3)}, metadata = ${this.ph(4)}::jsonb`,
        [record.id, record.key, `[${record.embedding.join(',')}]`, record.content, JSON.stringify(record.metadata || {})]
      );
    } else {
      await this.adapter.query(
        `INSERT INTO ideia_vectors (id, key, embedding, content, metadata, created_at)
         VALUES (${this.ph(0)}, ${this.ph(1)}, ${this.ph(2)}, ${this.ph(3)}, ${this.ph(4)}, ${this.now()})
         ON CONFLICT (key) DO UPDATE SET embedding = ${this.ph(2)}, content = ${this.ph(3)}, metadata = ${this.ph(4)}`,
        [record.id, record.key, JSON.stringify(record.embedding || []), record.content, JSON.stringify(record.metadata || {})]
      );
    }
  }

  async search(queryEmbedding: number[], limit = 10): Promise<VectorSearchResult[]> {
    if (this.dbType === 'postgres') {
      type PgRow = { id: string; key: string; content: string; metadata: string; created_at: string; distance: number };
      const result = await this.adapter.query<PgRow>(
        `SELECT id, key, content, metadata, created_at, embedding <=> ${this.ph(0)}::vector AS distance
         FROM ideia_vectors ORDER BY distance ASC LIMIT ${this.ph(1)}`,
        [`[${queryEmbedding.join(',')}]`, limit]
      );
      return result.rows.map(r => ({
        id: r.id, key: r.key, content: r.content,
        metadata: typeof r.metadata === 'string' ? JSON.parse(r.metadata) : r.metadata,
        createdAt: r.created_at, distance: r.distance,
      }));
    }

    const all = await this.adapter.query<{ id: string; key: string; embedding: string; content: string; metadata: string; created_at: string }>(
      'SELECT id, key, embedding, content, metadata, created_at FROM ideia_vectors'
    );
    const scored = all.rows.map(r => {
      const stored = JSON.parse(r.embedding) as number[];
      return { r, score: cosineSimilarity(queryEmbedding, stored) };
    });
    return scored.sort((a, b) => b.score - a.score).slice(0, limit).map(s => ({
      id: s.r.id, key: s.r.key, content: s.r.content,
      metadata: JSON.parse(s.r.metadata), createdAt: s.r.created_at,
      distance: 1 - s.score,
    }));
  }

  async findByKey(key: string): Promise<VectorRecord | null> {
    const result = await this.adapter.query<VectorRecord>(
      `SELECT id, key, content, metadata, created_at as "createdAt"
       FROM ideia_vectors WHERE key = ${this.ph(0)}`, [key]
    );
    return result.rows[0] || null;
  }

  async delete(key: string): Promise<void> {
    await this.adapter.query(`DELETE FROM ideia_vectors WHERE key = ${this.ph(0)}`, [key]);
  }

  async count(): Promise<number> {
    const result = await this.adapter.query<{ count: number }>('SELECT COUNT(*) as count FROM ideia_vectors');
    return Number(result.rows[0]?.count || 0);
  }
}

function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0, magA = 0, magB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i]; magA += a[i] * a[i]; magB += b[i] * b[i];
  }
  const denom = Math.sqrt(magA) * Math.sqrt(magB);
  return denom === 0 ? 0 : dot / denom;
}
