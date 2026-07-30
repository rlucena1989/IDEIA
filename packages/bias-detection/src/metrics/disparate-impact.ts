// ==========================================================================
// metrics/disparate-impact.ts
// ==========================================================================
import type { Severity } from '../types';

export class DisparateImpactMetric {
  static compute(predictions: boolean[], _actual: boolean[], sensitive: boolean[]): number {
    const privPred = predictions.filter((_, i) => sensitive[i]);
    const unprivPred = predictions.filter((_, i) => !sensitive[i]);
    const privRate = privPred.filter(Boolean).length / Math.max(privPred.length, 1);
    const unprivRate = unprivPred.filter(Boolean).length / Math.max(unprivPred.length, 1);
    if (privRate === 0) return 0;
    return Math.min(unprivRate / privRate, 1);
  }

  static interpret(value: number, threshold: number): { interpretation: string; severity: Severity; recommendation: string } {
    const ratio = (value * 100).toFixed(1);
    const passed = value >= threshold;
    let severity: Severity;
    if (value >= 1) severity = 'none';
    else if (value >= threshold) severity = 'low';
    else if (value >= threshold * 0.8) severity = 'medium';
    else if (value >= threshold * 0.6) severity = 'high';
    else severity = 'critical';
    return {
      interpretation: passed ? 'Disparate impact ratio ' + ratio + '% meets 4/5ths rule' : 'Disparate impact ratio ' + ratio + '% violates 4/5ths rule',
      severity,
      recommendation: passed ? 'Rule satisfied.' : 'Selection rate for unprivileged group is ' + ratio + '% of privileged. Investigate feature bias.',
    };
  }
}
