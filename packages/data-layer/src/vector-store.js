"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.VectorStore = void 0;
class VectorStore {
    dimensions;
    adapter;
    ready = false;
    isPostgres;
    constructor(adapter, dimensions = 384, isPostgres = false) {
        this.adapter = adapter;
        this.dimensions = dimensions;
        this.isPostgres = isPostgres;
    }
    async ensureSchema() {
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
        }
        else {
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
    async insert(id, key, embedding, content, metadata) {
        if (this.isPostgres) {
            await this.adapter.query('INSERT INTO ideia_vectors (id, key, embedding, content, metadata, created_at) VALUES ($1, $2, $3::vector, $4, $5::jsonb, NOW()) ON CONFLICT (key) DO UPDATE SET embedding = $3::vector, content = $4, metadata = $5::jsonb', [id, key, `[${embedding.join(',')}]`, content, JSON.stringify(metadata || {})]);
        }
        else {
            await this.adapter.query('INSERT INTO ideia_vectors (id, key, embedding, content, metadata, created_at) VALUES (?, ?, ?, ?, ?, datetime(\'now\')) ON CONFLICT (key) DO UPDATE SET embedding = ?, content = ?, metadata = ?', [id, key, JSON.stringify(embedding), content, JSON.stringify(metadata || {}), JSON.stringify(embedding), content, JSON.stringify(metadata || {})]);
        }
    }
    async search(queryEmbedding, limit = 10) {
        if (this.isPostgres) {
            const result = await this.adapter.query(`SELECT id, key, content, metadata, created_at, embedding <=> $1::vector AS distance
         FROM ideia_vectors ORDER BY distance ASC LIMIT $2`, [`[${queryEmbedding.join(',')}]`, limit]);
            return result.rows.map(r => ({
                id: r.id,
                key: r.key,
                embedding: [],
                content: r.content,
                metadata: typeof r.metadata === 'string' ? JSON.parse(r.metadata) : r.metadata,
                createdAt: r.created_at,
            }));
        }
        const all = await this.adapter.query('SELECT id, key, embedding, content, metadata, created_at FROM ideia_vectors');
        const scored = all.rows.map(r => {
            const stored = JSON.parse(r.embedding);
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
    async delete(key) {
        await this.adapter.query('DELETE FROM ideia_vectors WHERE key = ?', [key]);
    }
    async count() {
        const result = await this.adapter.query('SELECT COUNT(*) AS count FROM ideia_vectors');
        return Number(result.rows[0]?.count || 0);
    }
}
exports.VectorStore = VectorStore;
function cosineSimilarity(a, b) {
    let dot = 0, magA = 0, magB = 0;
    for (let i = 0; i < a.length; i++) {
        dot += a[i] * b[i];
        magA += a[i] * a[i];
        magB += b[i] * b[i];
    }
    const denom = Math.sqrt(magA) * Math.sqrt(magB);
    return denom === 0 ? 0 : dot / denom;
}
//# sourceMappingURL=vector-store.js.map