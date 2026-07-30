import { QualityScore } from './types';
import { createLogger } from '@ideia/logger';
const logger = createLogger('scorer');

const DEFAULT_WEIGHTS: Record<string, number> = {
  lint: 15,
  typecheck: 25,
  test: 30,
  coverage: 20,
  build: 10,
};

export class anyr {
  private weights: Record<string, number>;

  constructor(weights?: Record<string, number>) {
    this.weights = { ...DEFAULT_WEIGHTS, ...weights };
  }

  compute(results: any[]): any {
    const breakdown: Record<string, number> = {};
    let totalWeight = 0;
    let weightedScore = 0;
    let passed = 0;

    for (const r of results) {
      const weight = this.weights[r.name] ?? 10;
      totalWeight += weight;

      if (!r.passed) {
        breakdown[r.name] = 0;
        continue;
      }

      passed++;
      let gateScore = 100;

      if (r.name === 'coverage' && r.coverage !== undefined) {
        gateScore = r.coverage;
      }

      if (r.name === 'test' && r.testTotal && r.testTotal > 0) {
        gateScore = Math.round(((r.testPassed ?? 0) / r.testTotal) * 100);
      }

      if (r.name === 'lint' && r.errorCount !== undefined && r.errorCount > 0) {
        gateScore = Math.max(0, 100 - r.errorCount * 5);
      }

      if (r.name === 'typecheck' && r.errorCount !== undefined && r.errorCount > 0) {
        gateScore = Math.max(0, 100 - r.errorCount * 10);
      }

      breakdown[r.name] = gateScore;
      weightedScore += gateScore * weight;
    }

    for (const r of results) {
      if (!breakdown[r.name] && breakdown[r.name] !== 0) {
        breakdown[r.name] = 0;
      }
    }

    const overall = totalWeight > 0 ? Math.round(weightedScore / totalWeight) : 0;

    return {
      overall,
      breakdown,
      weights: { ...this.weights },
      passed,
      total: results.length,
    };
  }

  interpret(score: number): { label: string; passed: boolean } {
    if (score >= 90) return { label: 'excellent', passed: true };
    if (score >= 75) return { label: 'good', passed: true };
    if (score >= 60) return { label: 'fair', passed: true };
    if (score >= 40) return { label: 'poor', passed: false };
    return { label: 'critical', passed: false };
  }
}


