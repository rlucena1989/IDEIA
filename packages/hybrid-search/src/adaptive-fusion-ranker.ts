import { RankedItem, FusionResult } from './types';
import { createLogger } from '@ideia/logger';
const logger = createLogger('adaptive-fusion-ranker');

export class AdaptiveFusionRanker {
  private _weights: [number, number, number] = [0.4, 0.4, 0.2];
  private _lr = 0.05;
  private _gamma = 0.9;
  private _history: Array<{ weights: [number, number, number]; reward: number }> = [];
  private _rewardEMA = 0;

  async update(
    textResults: RankedItem[], vectorResults: RankedItem[], sparseResults: RankedItem[],
    _clickIndex: number
  ): Promise<void> {
    const fused = this._fuse(textResults, vectorResults, sparseResults);
    const clickedRank = fused.findIndex(r => r.id === (_clickIndex >= 0 ? fused[_clickIndex]?.id : ''));
    const reward = clickedRank >= 0 ? 1 / (clickedRank + 1) : 0;

    this._rewardEMA = this._gamma * this._rewardEMA + (1 - this._gamma) * reward;
    const baseline = this._rewardEMA;
    const advantage = reward - baseline;
    const grads = this._computeGradients();

    for (let i = 0; i < 3; i++) {
      this._weights[i] = Math.max(0.05, Math.min(0.9, this._weights[i] + this._lr * advantage * grads[i]));
    }
    const sum = this._weights.reduce((a, b) => a + b, 0);
    this._weights = [(this._weights[0] / sum), (this._weights[1] / sum), (this._weights[2] / sum)];

    this._history.push({ weights: [...this._weights], reward });
    if (this._history.length > 100) this._history.shift();
  }

  getWeights(): [number, number, number] {
    return [...this._weights];
  }

  getConvergenceScore(): number {
    if (this._history.length < 10) return 0;
    const recent = this._history.slice(-10);
    const mean = recent.reduce((s, h) => s + h.reward, 0) / recent.length;
    const variance = recent.reduce((s, h) => s + Math.pow(h.reward - mean, 2), 0) / recent.length;
    return Math.max(0, 1 - variance);
  }

  fusedScore(docId: string, textRanks: Map<string, number>, vectorRanks: Map<string, number>, sparseRanks: Map<string, number>, k = 60): number {
    const tr = textRanks.get(docId);
    const vr = vectorRanks.get(docId);
    const sr = sparseRanks.get(docId);
    return (this._weights[0] * (tr ? 1 / (k + tr) : 0)) +
           (this._weights[1] * (vr ? 1 / (k + vr) : 0)) +
           (this._weights[2] * (sr ? 1 / (k + sr) : 0));
  }

  private _fuse(text: RankedItem[], vector: RankedItem[], sparse: RankedItem[]): FusionResult[] {
    const map = new Map<string, FusionResult>();
    const k = 60;
    [text, vector, sparse].forEach((list, idx) => {
      list.forEach((item, rank) => {
        const w = this._weights[idx];
        const existing = map.get(item.id);
        const score = w / (k + rank + 1);
        if (existing) {
          existing.rrfScore += score;
        } else {
          map.set(item.id, {
            id: item.id, rrfScore: score, individualScores: {},
            metadata: item.metadata, content: item.content,
          });
        }
      });
    });
    return Array.from(map.values()).sort((a, b) => b.rrfScore - a.rrfScore);
  }

  private _computeGradients(): number[] {
    return [0.1, 0.1, -0.05];
  }
}
