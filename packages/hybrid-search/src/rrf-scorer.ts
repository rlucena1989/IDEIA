import { RankedItem, FusionResult, SearchWeights, FusionAlgorithm } from './types';
import { createLogger } from '@ideia/logger';
const logger = createLogger('rrf-scorer');

export class RRFScorer {
  private readonly DEFAULT_K = 60;

  fuse(
    rankedLists: RankedItem[][],
    sourceNames: string[],
    weights: SearchWeights,
    algorithm: FusionAlgorithm = 'rrf'
  ): FusionResult[] {
    switch (algorithm) {
      case 'rrf': return this._rrfFusion(rankedLists, sourceNames, weights);
      case 'borda': return this._bordaFusion(rankedLists, sourceNames, weights);
      case 'combsum': return this._combSumFusion(rankedLists, sourceNames, weights);
      case 'combmnz': return this._combMNZFusion(rankedLists, sourceNames, weights);
      case 'weighted_rrf': return this._weightedRRF(rankedLists, sourceNames, weights);
      default: return this._rrfFusion(rankedLists, sourceNames, weights);
    }
  }

  private _rrfFusion(
    lists: RankedItem[][],
    sources: string[],
    weights: SearchWeights,
    k: number = this.DEFAULT_K
  ): FusionResult[] {
    const scoreMap = new Map<string, FusionResult>();

    for (let listIdx = 0; listIdx < lists.length; listIdx++) {
      const source = sources[listIdx];
      const weight = this._getWeight(source, weights);
      const items = lists[listIdx];

      for (let rank = 0; rank < items.length; rank++) {
        const item = items[rank];
        const existing = scoreMap.get(item.id);

        if (existing) {
          existing.rrfScore += weight / (k + rank + 1);
          existing.individualScores[source] = item.score;
        } else {
          scoreMap.set(item.id, {
            id: item.id,
            rrfScore: weight / (k + rank + 1),
            individualScores: { [source]: item.score },
            metadata: item.metadata,
            content: item.content,
          });
        }
      }
    }

    return Array.from(scoreMap.values()).sort((a, b) => b.rrfScore - a.rrfScore);
  }

  private _bordaFusion(
    lists: RankedItem[][],
    sources: string[],
    weights: SearchWeights
  ): FusionResult[] {
    const scoreMap = new Map<string, FusionResult>();

    for (let listIdx = 0; listIdx < lists.length; listIdx++) {
      const source = sources[listIdx];
      const weight = this._getWeight(source, weights);
      const items = lists[listIdx];
      const n = items.length;

      for (let rank = 0; rank < items.length; rank++) {
        const item = items[rank];
        const bordaScore = (n - rank) * weight;
        const existing = scoreMap.get(item.id);

        if (existing) {
          existing.rrfScore += bordaScore;
          existing.individualScores[source] = item.score;
        } else {
          scoreMap.set(item.id, {
            id: item.id,
            rrfScore: bordaScore,
            individualScores: { [source]: item.score },
            metadata: item.metadata,
            content: item.content,
          });
        }
      }
    }

    return Array.from(scoreMap.values()).sort((a, b) => b.rrfScore - a.rrfScore);
  }

  private _combSumFusion(
    lists: RankedItem[][],
    sources: string[],
    weights: SearchWeights
  ): FusionResult[] {
    const scoreMap = new Map<string, { scores: Record<string, number>; metadata: Record<string, unknown>; content: string }>();

    for (let listIdx = 0; listIdx < lists.length; listIdx++) {
      const source = sources[listIdx];
      const weight = this._getWeight(source, weights);
      const items = lists[listIdx];
      if (items.length === 0) continue;

      const maxScore = Math.max(...items.map(i => i.score));
      const minScore = Math.min(...items.map(i => i.score));
      const range = maxScore - minScore || 1;

      for (const item of items) {
        const normalized = ((item.score - minScore) / range) * weight;
        const existing = scoreMap.get(item.id);
        if (existing) {
          existing.scores[source] = normalized;
        } else {
          scoreMap.set(item.id, {
            scores: { [source]: normalized },
            metadata: item.metadata,
            content: item.content,
          });
        }
      }
    }

    return Array.from(scoreMap.entries())
      .map(([id, data]) => ({
        id,
        rrfScore: Object.values(data.scores).reduce((a, b) => a + b, 0),
        individualScores: data.scores,
        metadata: data.metadata,
        content: data.content,
      }))
      .sort((a, b) => b.rrfScore - a.rrfScore);
  }

  private _combMNZFusion(
    lists: RankedItem[][],
    sources: string[],
    weights: SearchWeights
  ): FusionResult[] {
    const combSum = this._combSumFusion(lists, sources, weights);
    const systemCount = lists.filter(l => l.length > 0).length;
    for (const result of combSum) {
      const retrievedBy = Object.keys(result.individualScores).length;
      result.rrfScore *= retrievedBy / systemCount;
    }
    return combSum.sort((a, b) => b.rrfScore - a.rrfScore);
  }

  private _weightedRRF(
    lists: RankedItem[][],
    sources: string[],
    weights: SearchWeights
  ): FusionResult[] {
    const weightMap: SearchWeights = {
      text: weights.text ?? 0.4,
      vector: weights.vector ?? 0.4,
      sparse: weights.sparse ?? 0.2,
    };
    return this._rrfFusion(lists, sources, weightMap);
  }

  private _getWeight(source: string, weights: SearchWeights): number {
    const w: Record<string, number> = {
      text: weights.text ?? 0.4,
      vector: weights.vector ?? 0.4,
      sparse: weights.sparse ?? 0.2,
    };
    return w[source] ?? 1;
  }
}
