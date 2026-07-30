export interface ChangepointResult {
  index: number;
  beforeMean: number;
  afterMean: number;
  magnitude: number;
  significant: boolean;
  pValue: number;
}

export class PELTDetector {
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
        const cost = bestCost[s] + this.gaussianCost(values, s, t) + p;
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
    return cps.map(cp => {
      const before = values.slice(Math.max(0, cp - 10), cp);
      const after = values.slice(cp, Math.min(values.length, cp + 10));
      const bMean = before.reduce((s, v) => s + v, 0) / before.length;
      const aMean = after.reduce((s, v) => s + v, 0) / after.length;
      return {
        index: cp,
        beforeMean: bMean,
        afterMean: aMean,
        magnitude: Math.abs(bMean - aMean),
        significant: Math.abs(bMean - aMean) > 0.2 * values.reduce((s, v) => s + v, 0) / values.length,
        pValue: alpha,
      };
    });
  }

  private gaussianCost(values: number[], start: number, end: number): number {
    const segment = values.slice(start, end);
    const mean = segment.reduce((s, v) => s + v, 0) / segment.length;
    const var_ = segment.reduce((s, v) => s + (v - mean) ** 2, 0) / segment.length;
    return segment.length * Math.log(var_ + 1e-10);
  }
}
