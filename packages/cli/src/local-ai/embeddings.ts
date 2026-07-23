import * as crypto from 'node:crypto';

/** generateTFIDFVector */
export function generateTFIDFVector(text: string): Record<string, number> {
  const vector: Record<string, number> = {};
  const words = text.toLowerCase()
    .replace(/[^a-zà-ú0-9\s]/g, '')
    .split(/\s+/)
    .filter(w => w.length > 2);

  const stopwords = new Set([
    'que', 'para', 'com', 'por', 'como', 'mais', 'mas', 'dos', 'das', 'num',
    'uma', 'seu', 'sua', 'tem', 'sao', 'esta', 'este', 'essa', 'isso', 'aqui',
    'the', 'and', 'for', 'are', 'was', 'was', 'has', 'had', 'but', 'not', 'all',
    'any', 'can', 'had', 'her', 'was', 'one', 'our', 'out', 'das', 'você',
  ]);

  const termFreq: Record<string, number> = {};
  for (const word of words) {
    if (stopwords.has(word)) continue;
    termFreq[word] = (termFreq[word] || 0) + 1;
  }

  const maxFreq = Math.max(...Object.values(termFreq), 1);
  for (const [term, freq] of Object.entries(termFreq)) {
    vector[term] = freq / maxFreq;
  }

  return vector;
}

/** cosineSimilarity */
export function cosineSimilarity(a: Record<string, number>, b: Record<string, number>): number {
  let dot = 0, magA = 0, magB = 0;

  for (const [term, val] of Object.entries(a)) {
    magA += val * val;
    if (b[term] !== undefined) dot += val * b[term];
  }

  for (const val of Object.values(b)) {
    magB += val * val;
  }

  const denom = Math.sqrt(magA) * Math.sqrt(magB);
  return denom === 0 ? 0 : dot / denom;
}

/** Interface que define a estrutura de indexed document. */
export interface IndexedDocument {
  path: string;
  content: string;
  hash: string;
  vector: Record<string, number>;
  indexedAt: string;
}

/** hashContent */
export function hashContent(content: string): string {
  return crypto.createHash('sha256').update(content).digest('hex').slice(0, 16);
}

/** extractRelevantChunk */
export function extractRelevantChunk(text: string, query: string, maxChars: number = 300): string {
  const lower = text.toLowerCase();
  const queryWords = query.toLowerCase().split(/\s+/).filter(w => w.length > 2);

  let bestIdx = -1;
  let bestScore = 0;

  for (const qw of queryWords) {
    const idx = lower.indexOf(qw);
    if (idx !== -1) {
      const score = queryWords.reduce((s, w) => s + (lower.slice(idx, idx + 500).includes(w) ? 1 : 0), 0);
      if (score > bestScore) {
        bestScore = score;
        bestIdx = idx;
      }
    }
  }

  if (bestIdx === -1) return text.slice(0, maxChars);

  const start = Math.max(0, bestIdx - 100);
  const end = Math.min(text.length, start + maxChars);
  let chunk = text.slice(start, end);

  if (start > 0) chunk = '...' + chunk;
  if (end < text.length) chunk = chunk + '...';

  return chunk;
}

/** Interface que define a estrutura de neural embedding result. */
export interface NeuralEmbeddingResult {
  vector: number[];
  model: string;
  dimensions: number;
}

/** generateNeuralEmbedding */
export async function generateNeuralEmbedding(
  text: string,
  options?: { model?: string; ollamaHost?: string }
): Promise<NeuralEmbeddingResult> {
  const model = options?.model || 'nomic-embed-text';
  const host = options?.ollamaHost || 'http://localhost:11434';

  const response = await fetch(`${host}/api/embeddings`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model, prompt: text }),
  });

  if (!response.ok) {
    throw new Error(`Ollama embedding failed: ${response.status} ${response.statusText}`);
  }

  const data = await response.json() as { embedding: number[] };
  return { vector: data.embedding, model, dimensions: data.embedding.length };
}

/** generateBatchEmbeddings */
export async function generateBatchEmbeddings(
  texts: string[],
  options?: { model?: string; ollamaHost?: string; batchSize?: number }
): Promise<NeuralEmbeddingResult[]> {
  const batchSize = options?.batchSize || 10;
  const results: NeuralEmbeddingResult[] = [];

  if (!texts || texts.length === 0) return [];
  for (let i = 0; i < texts.length; i += batchSize) {
    const batch = texts.slice(i, i + batchSize);
    const batchResults = await Promise.all(
      batch.map((t) => generateNeuralEmbedding(t, options))
    );
    results.push(...batchResults);
  }

  return results;
}

/** cosineSimilarityDense */
export function cosineSimilarityDense(a: number[], b: number[]): number {
  let dot = 0, magA = 0, magB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i]! * b[i]!;
    magA += a[i]! * a[i]!;
    magB += b[i]! * b[i]!;
  }
  const denom = Math.sqrt(magA) * Math.sqrt(magB);
  return denom === 0 ? 0 : dot / denom;
}

/** normalizeVector */
export function normalizeVector(vec: number[]): number[] {
  const mag = Math.sqrt(vec.reduce((sum, v) => sum + v * v, 0));
  return mag === 0 ? vec : vec.map((v) => v / mag);
}

/** embedQuery */
export function embedQuery(query: string): Record<string, number> {
  return generateTFIDFVector(query);
}
