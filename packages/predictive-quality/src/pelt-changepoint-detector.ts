import { ChangepointResult } from './types';
import { createLogger } from '@ideia/logger';
const logger = createLogger('pelt-changepoint-detector');

export class PELTChangepointDetector {
  detect(values: number[], penalty?: number): number[] {
    const n = values.length;
    const p = penalty ?? 2 * Math.log(values.length);
    const bestCost = new Array(n + 1).fill(0);
    const bestCP = new Array(n + 1).fill(-1);
    const candidates = [0];
    for (let t = 1; t <= n; t++) {
      let minCost = Infinity;
      let minCP = -1;
      const newCandidates: number[] = [];
      for (const s of candidates) {
        const cost = bestCost[s] + this._gaussianCost(values, s, t) + p;
        if (cost < minCost) { minCost = cost; minCP = s; }
        if (cost <= bestCost[t] + p) newCandidates.push(s);
      }
      bestCost[t] = minCost;
      bestCP[t] = minCP;
      candidates.push(t);
    }
    const changepoints: number[] = [];
    let cp = bestCP[n];
    while (cp > 0) { changepoints.push(cp); cp = bestCP[cp]; }
    return changepoints.reverse();
  }

  async detectWithSignificance(values: number[], alpha = 0.05): Promise<ChangepointResult[]> {
    const cps = this.detect(values);
    const results: ChangepointResult[] = [];
    for (const cp of cps) {
      const before = values.slice(Math.max(0, cp - 10), cp);
      const after = values.slice(cp, Math.min(values.length, cp + 10));
      const pValue = this._mannWhitneyUTest(before, after);
      const beforeMean = before.reduce((s, v) => s + v, 0) / Math.max(before.length, 1);
      const afterMean = after.reduce((s, v) => s + v, 0) / Math.max(after.length, 1);
      results.push({ index: cp, beforeMean, afterMean, magnitude: Math.abs(beforeMean - afterMean), significant: pValue < alpha, pValue });
    }
    return results;
  }

  private _gaussianCost(values: number[], start: number, end: number): number {
    const segment = values.slice(start, end);
    const mean = segment.reduce((s, v) => s + v, 0) / Math.max(segment.length, 1);
    const variance = segment.reduce((s, v) => s + (v - mean) ** 2, 0) / Math.max(segment.length, 1);
    return segment.length * Math.log(variance + 1e-10);
  }

  private _mannWhitneyUTest(a: number[], b: number[]): number {
    const combined = [...a, ...b];
    const ranks = combined.map((v, i) => ({ v, group: i < a.length ? 0 : 1 })).sort((x, y) => x.v - y.v).map((x, i) => ({ ...x, rank: i + 1 }));
    const r1 = ranks.filter(r => r.group === 0).reduce((s, r) => s + r.rank, 0);
    const n1 = a.length, n2 = b.length;
    const u = r1 - (n1 * (n1 + 1)) / 2;
    const mu = (n1 * n2) / 2;
    const sigma = Math.sqrt((n1 * n2 * (n1 + n2 + 1)) / 12);
    const z = sigma > 0 ? (u - mu) / sigma : 0;
    return 2 * this._normalCdf(-Math.abs(z));
  }

  private _normalCdf(x: number): number {
    return 0.5 * (1 + this._erf(x / Math.sqrt(2)));
  }

  private _erf(x: number): number {
    const a1 = 0.254829592, a2 = -0.284496736, a3 = 1.421413741, a4 = -1.453152027, a5 = 1.061405429, p = 0.3275911;
    const sign = x < 0 ? -1 : 1;
    x = Math.abs(x);
    const t = 1.0 / (1.0 + p * x);
    return sign * (1.0 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-x * x));
  }
}
