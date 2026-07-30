// ==========================================================================
// metrics/composite-score.ts
// ==========================================================================

import type { BiasMetricResult } from "../types";

export class CompositeScoreMetric {
  static compute(metrics: BiasMetricResult[], threshold: number): BiasMetricResult {
    const weights: Record<string, number> = {
      demographic_parity: 0.2, equal_opportunity: 0.2, equalized_odds: 0.2,
      disparate_impact: 0.15, statistical_parity_difference: 0.1, theil_index: 0.075,
    };
    let weightedSum = 0, totalWeight = 0;
    for (const m of metrics) {
      const w = weights[m.name] ?? 0.1;
      const normalized = m.name === "disparate_impact" ? Math.max(0, 1 - m.value) : Math.min(1, m.value / (m.threshold || 0.01));
      weightedSum += normalized * w;
      totalWeight += w;
    }
    const composite = totalWeight > 0 ? weightedSum / totalWeight : 0;
    const passed = composite <= threshold;
    let severity: string;
    if (composite <= threshold * 0.5) severity = "none";
    else if (composite <= threshold) severity = "low";
    else if (composite <= threshold * 1.5) severity = "medium";
    else if (composite <= threshold * 2) severity = "high";
    else severity = "critical";
    return {
      name: "composite_score" as any, displayName: "Composite Score",
      value: composite, threshold, passed,
      confidenceLower: composite * 0.9, confidenceUpper: composite * 1.1,
      pValue: composite > threshold ? 0.01 : 0.5,
      interpretation: passed ? "Score " + (composite * 100).toFixed(1) + "% acceptable" : "Score " + (composite * 100).toFixed(1) + "% exceeds threshold",
      severity: severity as any,
      recommendation: passed ? "Overall bias level acceptable." : "Address individual metric violations to reduce composite score.",
    };
  }
}
