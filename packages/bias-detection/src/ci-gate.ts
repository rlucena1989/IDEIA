// ==========================================================================
// ci-gate.ts
// ==========================================================================

import type { BiasReport, BiasDetectorConfig } from "./types";

export class CIGate {
  constructor(private config: BiasDetectorConfig) {}

  evaluate(report: BiasReport): { status: string; action: "proceed" | "proceed-with-warning" | "block"; message: string } {
    const action = report.overallStatus === "pass" ? "proceed" : report.overallStatus === "warn" ? "proceed-with-warning" : this.config.ciActionOnFail === "fail" ? "block" : "proceed-with-warning";
    const lines: string[] = [
      "=== BIAS CI GATE ===",
      "Status: " + report.overallStatus.toUpperCase(),
      "Action: " + action,
      "Score: " + (report.compositeScore * 100).toFixed(1) + "%",
    ];
    for (const v of report.criticalViolations) {
      lines.push("!! " + v);
    }
    return { status: report.overallStatus, action, message: lines.join("\n") };
  }
}
