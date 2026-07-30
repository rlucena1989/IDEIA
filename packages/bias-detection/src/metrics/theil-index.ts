// ==========================================================================
// metrics/theil-index.ts
// ==========================================================================

import type { Severity } from "../types";

export class TheilIndexMetric {
  static compute(_predictions: boolean[], actual: boolean[], sensitive: boolean[]): number {
    const n = actual.length;
    const groups = new Map<boolean, number[]>();
    groups.set(true, []);
    groups.set(false, []);
    for (let i = 0; i < n; i++) groups.get(sensitive[i])!.push(actual[i] ? 1 : 0);
    const overallMean = actual.filter(Boolean).length / n;
    if (overallMean === 0 || overallMean === 1) return 0;
    let theil = 0;
    const shares = [groups.get(true)!.length / n, groups.get(false)!.length / n];
    const means = [
      groups.get(true)!.reduce((s, v) => s + v, 0) / Math.max(groups.get(true)!.length, 1),
      groups.get(false)!.reduce((s, v) => s + v, 0) / Math.max(groups.get(false)!.length, 1),
    ];
    for (let i = 0; i < 2; i++) {
      if (means[i] > 0) theil += shares[i] * (means[i] / overallMean) * Math.log(means[i] / overallMean);
    }
    return Math.abs(theil);
  }

  static interpret(value: number, threshold: number): { interpretation: string; severity: Severity; recommendation: string } {
    const passed = value <= threshold;
    let severity: Severity;
    if (value <= threshold * 0.5) severity = "none";
    else if (value <= threshold) severity = "low";
    else if (value <= threshold * 1.5) severity = "medium";
    else severity = "high";
    return {
      interpretation: passed ? "Theil index " + value.toFixed(3) + " within bounds" : "Theil index " + value.toFixed(3) + " exceeds " + threshold,
      severity,
      recommendation: passed ? "Inequality within bounds." : "Inequality index " + value.toFixed(3) + ". Review feature distributions.",
    };
  }
}
