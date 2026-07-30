export interface QualityReport {
  dimensions: number;
  meanVariance: number;
  outlierCount: number;
  score: number;
  driftDetected: boolean;
}

export class EmbeddingQualityEvaluator {
  private history: QualityReport[] = [];
  private maxHistory: number;

  constructor(maxHistory = 50) {
    this.maxHistory = maxHistory;
  }

  evaluate(embeddings: number[][]): QualityReport {
    if (embeddings.length === 0) {
      return { dimensions: 0, meanVariance: 0, outlierCount: 0, score: 100, driftDetected: false };
    }

    const dimensions = embeddings[0].length;
    const dimVariances: number[] = [];

    for (let d = 0; d < dimensions; d++) {
      const values = embeddings.map(v => v[d]);
      const mean = values.reduce((s, x) => s + x, 0) / values.length;
      const variance = values.reduce((s, x) => s + (x - mean) ** 2, 0) / values.length;
      dimVariances.push(variance);
    }

    const meanVariance = dimVariances.reduce((s, x) => s + x, 0) / dimVariances.length;
    const varianceStd = Math.sqrt(dimVariances.reduce((s, x) => s + (x - meanVariance) ** 2, 0) / dimVariances.length);
    const outlierThreshold = 3;

    let outlierCount = 0;
    for (const v of dimVariances) {
      const zScore = varianceStd > 0 ? Math.abs(v - meanVariance) / varianceStd : 0;
      if (zScore > outlierThreshold) outlierCount++;
    }

    const score = this.computeScore(dimVariances, meanVariance, outlierCount, embeddings.length);
    let driftDetected = false;

    if (this.history.length > 0) {
      const last = this.history[this.history.length - 1];
      driftDetected = this.compare(last, { dimensions, meanVariance, outlierCount, score, driftDetected: false });
    }

    const report: QualityReport = { dimensions, meanVariance, outlierCount, score, driftDetected };
    this.history.push(report);
    if (this.history.length > this.maxHistory) {
      this.history = this.history.slice(-this.maxHistory);
    }

    return report;
  }

  compare(previous: QualityReport, current: QualityReport): boolean {
    const dimDrift = Math.abs(previous.meanVariance - current.meanVariance) > 0.1;
    const outlierDrift = Math.abs(previous.outlierCount - current.outlierCount) > 2;
    const scoreDrift = Math.abs(previous.score - current.score) > 15;
    return dimDrift || outlierDrift || scoreDrift;
  }

  getScore(report?: QualityReport): number {
    const target = report ?? (this.history.length > 0 ? this.history[this.history.length - 1] : null);
    if (!target) return 100;
    return target.score;
  }

  getHistory(): QualityReport[] {
    return [...this.history];
  }

  private computeScore(
    dimVariances: number[],
    meanVariance: number,
    outlierCount: number,
    totalVectors: number,
  ): number {
    let score = 100;

    const zeroVarianceDims = dimVariances.filter(v => v === 0).length;
    score -= zeroVarianceDims * 10;

    if (outlierCount > 0) {
      score -= outlierCount * 5;
    }

    if (meanVariance < 0.01) score -= 20;
    else if (meanVariance < 0.05) score -= 10;
    else if (meanVariance > 0.5) score -= 15;

    if (totalVectors < 5) score -= 15;
    else if (totalVectors < 20) score -= 5;

    return Math.max(0, Math.min(100, Math.round(score)));
  }
}
