"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.VectorSearch = exports.OpenAIEmbeddingProvider = exports.OllamaEmbeddingProvider = void 0;
exports.cosineSimilarity = cosineSimilarity;
exports.normalizeVector = normalizeVector;
exports.createVectorSearch = createVectorSearch;
const crypto_1 = require("crypto");
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
function cosineSimilarity(a, b) {
    if (a.length !== b.length)
        return 0;
    let dot = 0, normA = 0, normB = 0;
    for (let i = 0; i < a.length; i++) {
        dot += (a[i] ?? 0) * (b[i] ?? 0);
        normA += (a[i] ?? 0) * (a[i] ?? 0);
        normB += (b[i] ?? 0) * (b[i] ?? 0);
    }
    const denom = Math.sqrt(normA) * Math.sqrt(normB);
    return denom === 0 ? 0 : dot / denom;
}
function normalizeVector(v) {
    const norm = Math.sqrt(v.reduce((s, x) => s + x * x, 0));
    return norm === 0 ? v : v.map(x => x / norm);
}
function tokenize(text) {
    return new Set(text.toLowerCase().split(/\W+/).filter(Boolean));
}
function keywordScore(query, content) {
    const qt = tokenize(query);
    const ct = tokenize(content);
    if (qt.size === 0)
        return 0;
    let matches = 0;
    for (const t of qt) {
        if (ct.has(t))
            matches++;
    }
    return matches / qt.size;
}
class OllamaEmbeddingProvider {
    dimensions;
    baseUrl;
    model;
    timeout;
    constructor(config = {}) {
        this.baseUrl = config.baseUrl ?? 'http://127.0.0.1:11434';
        this.model = config.model ?? 'nomic-embed-text';
        this.dimensions = config.dimensions ?? 768;
        this.timeout = config.timeout ?? 30000;
    }
    async embed(text) {
        const response = await fetch(`${this.baseUrl}/api/embed`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ model: this.model, input: [text] }),
            signal: AbortSignal.timeout(this.timeout),
        });
        if (!response.ok)
            throw new Error(`Ollama embed failed: ${response.statusText}`);
        const data = await response.json();
        if (!data.embeddings?.[0])
            throw new Error('Ollama returned empty embeddings');
        return data.embeddings[0];
    }
}
exports.OllamaEmbeddingProvider = OllamaEmbeddingProvider;
class OpenAIEmbeddingProvider {
    dimensions;
    apiKey;
    baseUrl;
    model;
    timeout;
    constructor(config = {}) {
        this.apiKey = config.apiKey ?? process.env.OPENAI_API_KEY ?? '';
        this.baseUrl = config.baseUrl ?? 'https://api.openai.com/v1';
        this.model = config.model ?? 'text-embedding-3-small';
        this.dimensions = config.dimensions ?? 1536;
        this.timeout = config.timeout ?? 30000;
    }
    async embed(text) {
        const response = await fetch(`${this.baseUrl}/embeddings`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${this.apiKey}`,
            },
            body: JSON.stringify({ model: this.model, input: text }),
            signal: AbortSignal.timeout(this.timeout),
        });
        if (!response.ok)
            throw new Error(`OpenAI embed failed: ${response.statusText}`);
        const data = await response.json();
        if (!data.data?.[0]?.embedding)
            throw new Error('OpenAI returned empty embeddings');
        return data.data[0].embedding;
    }
}
exports.OpenAIEmbeddingProvider = OpenAIEmbeddingProvider;
class VectorSearch {
    records = [];
    index = new Map();
    dimensions;
    embedder;
    constructor(dimensions = 384, embedder) {
        this.dimensions = dimensions;
        this.embedder = embedder;
    }
    setEmbedder(embedder) { this.embedder = embedder; this.dimensions = embedder.dimensions; }
    get embedderName() { return this.embedder ? 'configured' : 'none'; }
    get size() { return this.records.length; }
    getDimensions() { return this.dimensions; }
    async addAsync(content, metadata, vector) {
        let v = vector;
        if (!v && this.embedder) {
            v = await this.embedder.embed(content);
        }
        return this.add(content, metadata, v);
    }
    add(content, metadata, vector) {
        const v = vector ?? new Array(this.dimensions).fill(0);
        if (v.length !== this.dimensions && vector) {
            throw new Error(`Vector dimension mismatch: expected ${this.dimensions}, got ${v.length}`);
        }
        const doc = {
            id: (0, crypto_1.randomUUID)(),
            vector: normalizeVector(v),
            metadata: metadata ?? {},
            content,
            createdAt: new Date().toISOString(),
        };
        this.records.push(doc);
        this.index.set(doc.id, doc);
        return doc;
    }
    search(query, topK = 10, options) {
        const qv = Array.isArray(query) ? normalizeVector(query) : new Array(this.dimensions).fill(0);
        const minScore = options?.minScore ?? 0;
        const filter = options?.filter;
        const results = [];
        for (const record of this.records) {
            if (filter && !filter(record.metadata))
                continue;
            const semantic = cosineSimilarity(qv, record.vector);
            const kw = typeof query === 'string' ? keywordScore(query, record.content) : 0;
            const score = semantic * 0.7 + kw * 0.3;
            if (score >= minScore)
                results.push({ record, score });
        }
        return results.sort((a, b) => b.score - a.score).slice(0, topK);
    }
    async searchAsync(query, topK = 10, options) {
        let qv;
        if (this.embedder) {
            qv = normalizeVector(await this.embedder.embed(query));
        }
        else {
            qv = new Array(this.dimensions).fill(0);
        }
        const minScore = options?.minScore ?? 0;
        const filter = options?.filter;
        const results = [];
        for (const record of this.records) {
            if (filter && !filter(record.metadata))
                continue;
            const semantic = cosineSimilarity(qv, record.vector);
            const kw = keywordScore(query, record.content);
            const score = semantic * 0.7 + kw * 0.3;
            if (score >= minScore)
                results.push({ record, score });
        }
        return results.sort((a, b) => b.score - a.score).slice(0, topK);
    }
    get(id) { return this.index.get(id); }
    delete(id) {
        const idx = this.records.findIndex(r => r.id === id);
        if (idx === -1)
            return false;
        this.records.splice(idx, 1);
        this.index.delete(id);
        return true;
    }
    clear() { this.records = []; this.index.clear(); }
    serialize() {
        return JSON.stringify({
            dimensions: this.dimensions,
            records: this.records,
        });
    }
    saveToFile(filePath) {
        const dir = path_1.default.dirname(filePath);
        if (!fs_1.default.existsSync(dir))
            fs_1.default.mkdirSync(dir, { recursive: true });
        fs_1.default.writeFileSync(filePath, this.serialize(), 'utf-8');
    }
    static loadFromFile(filePath, embedder) {
        if (!fs_1.default.existsSync(filePath))
            return new VectorSearch(384, embedder);
        try {
            const raw = fs_1.default.readFileSync(filePath, 'utf-8');
            const data = JSON.parse(raw);
            const vs = new VectorSearch(data.dimensions || 384, embedder);
            for (const r of (data.records || [])) {
                vs.records.push(r);
                vs.index.set(r.id, r);
            }
            return vs;
        }
        catch {
            return new VectorSearch(384, embedder);
        }
    }
    static fromJSON(data, embedder) {
        const vs = new VectorSearch(data.dimensions || 384, embedder);
        for (const r of (data.records || [])) {
            vs.records.push(r);
            vs.index.set(r.id, r);
        }
        return vs;
    }
}
exports.VectorSearch = VectorSearch;
function createVectorSearch(dimensions) {
    return new VectorSearch(dimensions);
}
//# sourceMappingURL=vector-search.js.map