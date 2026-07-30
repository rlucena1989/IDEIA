// ==========================================================================
// metrics/equal-opportunity.ts
// ==========================================================================
import type { Severity } from '../types';

export class EqualOpportunityMetric {
  static compute(predictions: boolean[], actual: boolean[], sensitive: boolean[]): number {
    let privTP = 0, privTotal = 0, unprivTP = 0, unprivTotal = 0;
    for (let i = 0; i < predictions.length; i++) {
      if (!actual[i]) continue;
      if (sensitive[i]) { privTotal++; if (predictions[i]) privTP++; }
      else { unprivTotal++; if (predictions[i]) unprivTP++; }
    }
    return Math.abs((privTP / Math.max(privTotal, 1)) - (unprivTP / Math.max(unprivTotal, 1)));
  }

  static interpret(value: number, threshold: number): { interpretation: string; severity: Severity; recommendation: string } {
    const diff = (value * 100).toFixed(1);
    const passed = value <= threshold;
    let severity: Severity;
    if (value <= threshold * 0.5) severity = 'none';
    else if (value <= threshold) severity = 'low';
    else if (value <= threshold * 1.5) severity = 'medium';
    else if (value <= threshold * 2) severity = 'high';
    else severity = 'critical';
    return {
      interpretation: passed ? 'Equal opportunity maintained: ' + diff + '% TPR difference' : 'Equal opportunity violated: ' + diff + '% TPR difference',
      severity,
      recommendation: passed ? 'Monitor.' : 'TPR differs by ' + diff + '%. Review model performance.',
    };
  }
}
