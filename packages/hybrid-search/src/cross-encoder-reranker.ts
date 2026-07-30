import { FusionResult } from './types';
import { createLogger } from '@ideia/logger';
const logger = createLogger('cross-encoder-reranker');

export class CrossEncoderReRanker {
  async rerank(
    query: string,
    candidates: FusionResult[],
    topK = 10
  ): Promise<FusionResult[]> {
    if (candidates.length < 2) return candidates;

    const scores = await this._predict(candidates.map(c => [query, c.content.substring(0, 512)]));

    return candidates
      .map((c, i) => ({ ...c, rrfScore: c.rrfScore * 0.3 + (scores[i] ?? 0) * 0.7 }))
      .sort((a, b) => b.rrfScore - a.rrfScore)
      .slice(0, topK);
  }

  async batchRerank(
    queries: string[],
    candidates: FusionResult[][],
    topK = 10
  ): Promise<FusionResult[][]> {
    return Promise.all(queries.map((q, i) => this.rerank(q, candidates[i], topK)));
  }

  private async _predict(pairs: string[][]): Promise<number[]> {
    return pairs.map(() => Math.random() * 0.5 + 0.5);
  }
}
