import { ContextPack, ChunkMetadata, RetrievalQuery, RetrievedChunk } from './types';
import { createLogger } from '@ideia/logger';
const logger = createLogger('retrieval-augmented-context-pack');

export class RetrievalAugmentedContextPack {
  private _chunks: Map<string, { metadata: ChunkMetadata; content: string }> = new Map();
  private _embeddingDimension = 128;

  indexPack(pack: ContextPack): void {
    for (const section of pack.sections) {
      const key = `${pack.name}/${section.id}`;
      this._chunks.set(key, {
        metadata: {
          packName: pack.name,
          sectionId: section.id,
          tags: [...(pack.tags || []), ...(section.tags || [])],
          tokens: Math.ceil(section.content.length / 4),
          embedding: this._computeEmbedding(section.content),
          semanticVersion: pack.version,
        },
        content: section.content,
      });
    }
  }

  indexPacks(packs: ContextPack[]): void {
    for (const pack of packs) {
      this.indexPack(pack);
    }
  }

  async retrieve(query: RetrievalQuery): Promise<RetrievedChunk[]> {
    const queryEmbedding = this._computeEmbedding(
      `${query.taskType} ${query.taskDescription} ${query.language || ''} ${query.framework || ''}`
    );
    const results: RetrievedChunk[] = [];

    for (const [, { metadata, content }] of this._chunks) {
      const relevance = this._cosineSimilarity(
        queryEmbedding,
        metadata.embedding || Array(this._embeddingDimension).fill(0)
      );

      let tagBoost = 0;
      for (const tag of metadata.tags) {
        if (query.taskDescription.toLowerCase().includes(tag.toLowerCase())) tagBoost += 0.1;
        if (query.taskType.toLowerCase().includes(tag.toLowerCase())) tagBoost += 0.15;
      }

      const finalScore = Math.min(1, relevance + tagBoost);

      if (finalScore >= query.minRelevance) {
        results.push({
          chunk: metadata,
          content,
          relevanceScore: finalScore,
          confidence: this._estimateConfidence(finalScore, metadata),
        });
      }
    }

    results.sort((a, b) => b.relevanceScore - a.relevanceScore);

    const seen = new Set<string>();
    const deduplicated: RetrievedChunk[] = [];
    for (const r of results) {
      const key = `${r.chunk.packName}/${r.chunk.sectionId}`;
      if (!seen.has(key)) {
        seen.add(key);
        deduplicated.push(r);
      }
    }

    let tokenCount = 0;
    const budgeted: RetrievedChunk[] = [];
    for (const r of deduplicated) {
      if (tokenCount + r.chunk.tokens <= query.maxTokens) {
        budgeted.push(r);
        tokenCount += r.chunk.tokens;
      } else {
        break;
      }
    }

    return budgeted;
  }

  private _computeEmbedding(text: string): number[] {
    const tokens = text.toLowerCase().split(/\W+/).filter(Boolean);
    const freq = new Map<string, number>();
    for (const t of tokens) {
      freq.set(t, (freq.get(t) || 0) + 1);
    }

    const embedding = Array(this._embeddingDimension).fill(0);

    for (const [word, count] of freq) {
      let hash = 0;
      for (let i = 0; i < word.length; i++) {
        hash = ((hash << 5) - hash + word.charCodeAt(i)) | 0;
      }
      const dim = Math.abs(hash) % this._embeddingDimension;
      embedding[dim] += Math.log(1 + count);

      for (let i = 0; i < word.length - 1; i++) {
        const bigram = word.slice(i, i + 2);
        let bigramHash = 0;
        for (let j = 0; j < bigram.length; j++) {
          bigramHash = ((bigramHash << 5) - bigramHash + bigram.charCodeAt(j)) | 0;
        }
        const bigramDim = Math.abs(bigramHash) % this._embeddingDimension;
        embedding[bigramDim] += 0.5 * Math.log(1 + count);
      }
    }

    const norm = Math.sqrt(embedding.reduce((s, v) => s + v ** 2, 0));
    if (norm > 0) {
      for (let i = 0; i < embedding.length; i++) {
        embedding[i] /= norm;
      }
    }

    return embedding;
  }

  private _cosineSimilarity(a: number[], b: number[]): number {
    let dot = 0;
    let normA = 0;
    let normB = 0;
    for (let i = 0; i < a.length; i++) {
      dot += a[i] * b[i];
      normA += a[i] ** 2;
      normB += b[i] ** 2;
    }
    return dot / (Math.sqrt(normA) * Math.sqrt(normB) + 1e-8);
  }

  private _estimateConfidence(relevance: number, metadata: ChunkMetadata): number {
    let confidence = relevance;
    confidence *= 1 - Math.min(0.3, Math.abs(metadata.tokens - 500) / 2000);
    confidence *= 1 + (metadata.tags.length > 2 ? 0.1 : 0);
    return Math.min(1, Math.max(0, confidence));
  }
}
