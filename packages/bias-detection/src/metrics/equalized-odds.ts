// ==========================================================================
// metrics/equalized-odds.ts
// ==========================================================================
import type { Severity } from '../types';
import { EqualOpportunityMetric } from './equal-opportunity';

export class EqualizedOddsMetric {
  static compute(predictions: boolean[], actual: boolean[], sensitive: boolean[]): number {
    const tprDiff = EqualOpportunityMetric.compute(predictions, actual, sensitive);
    let privFP = 0, privTotal = 0, unprivFP = 0, unprivTotal = 0;
    for (let i = 0; i < predictions.length; i++) {
      if (actual[i]) continue;
      if (sensitive[i]) { privTotal++; if (predictions[i]) privFP++; }
      else { unprivTotal++; if (predictions[i]) unprivFP++; }
    }
    const fprDiff = Math.abs((privFP / Math.max(privTotal, 1)) - (unprivFP / Math.max(unprivTotal, 1)));
    return Math.max(tprDiff, fprDiff);
  }

  static interpret(value: number, threshold: number): { interpretation: string; severity: Severity; recommendation: string } {
    const passed = value <= threshold;
    let severity: Severity;
    if (value <= threshold * 0.5) severity = 'none';
    else if (value <= threshold) severity = 'low';
    else severity = 'high';
    return {
      interpretation: passed ? 'Equalized odds: max diff ' + (value*100).toFixed(1) + '%' : 'Equalized odds violated: max diff ' + (value*100).toFixed(1) + '%',
      severity,
      recommendation: passed ? 'Monitor.' : 'Adjust decision threshold per group to balance TPR and FPR.',
    };
  }
}
