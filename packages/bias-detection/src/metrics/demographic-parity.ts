// ==========================================================================
// metrics/demographic-parity.ts
// ==========================================================================
import type { Severity } from "../types";

export class DemographicParityMetric {
  static compute(predictions: boolean[], _actual: boolean[], sensitive: boolean[]): number {
    const privPred = predictions.filter((_, i) => sensitive[i]);
    const unprivPred = predictions.filter((_, i) => !sensitive[i]);
    return Math.abs(
      (privPred.filter(Boolean).length / Math.max(privPred.length, 1)) -
      (unprivPred.filter(Boolean).length / Math.max(unprivPred.length, 1))
    );
  }

  static interpret(value: number, threshold: number): { interpretation: string; severity: Severity; recommendation: string } {
    const diff = (value * 100).toFixed(1);
    const passed = value <= threshold;
    let severity: Severity;
    if (value <= threshold * 0.5) {
      severity = "none";
    } else if (value <= threshold) {
      severity = "low";
    } else if (value <= threshold * 1.5) {
      severity = "medium";
    } else if (value <= threshold * 2) {
      severity = "high";
    } else {
      severity = "critical";
    }
    return {
      interpretation: passed
        ? "Demographic parity maintained: " + diff + "% difference"
        : "Demographic parity violated: " + diff + "% exceeds threshold " + (threshold * 100).toFixed(0) + "%",
      severity,
      recommendation: passed
        ? "Continue monitoring."
        : "Reduce prediction rate disparity (" + diff + "%) via balanced training data or fairness constraints.",
    };
  }
}
