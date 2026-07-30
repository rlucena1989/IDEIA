import type { CoverageGap, GapSeverity } from './types';
import { createLogger } from '@ideia/logger';
const logger = createLogger('gap-prioritizer');

export interface GapRepairRecord {
  gapId: string;
  file: string;
  module: string;
  severity: GapSeverity;
  attemptedAt: string;
  success: boolean;
  durationMs: number;
  repairStrategy: string;
}

export interface WeightsConfig {
  critical: number;
  important: number;
  optional: number;
  cosmetic: number;
}

const DEFAULT_WEIGHTS: WeightsConfig = {
  critical: 100,
  important: 70,
  optional: 40,
  cosmetic: 10,
};

export class GapPrioritizer {
  private weights: WeightsConfig;
  private repairHistory: GapRepairRecord[] = [];

  constructor(weights?: Partial<WeightsConfig>) {
    this.weights = { ...DEFAULT_WEIGHTS, ...weights };
  }

  scoreGap(gap: CoverageGap): number {
    return this.weights[gap.severity] ?? 0;
  }

  prioritizeGaps(gaps: CoverageGap[]): CoverageGap[] {
    return [...gaps].sort((a, b) => this.scoreGap(b) - this.scoreGap(a));
  }

  rankBySeverity(gaps: CoverageGap[]): Record<GapSeverity, CoverageGap[]> {
    const ranked: Record<GapSeverity, CoverageGap[]> = {
      critical: [],
      important: [],
      optional: [],
      cosmetic: [],
    };
    for (const gap of gaps) {
      if (ranked[gap.severity]) ranked[gap.severity].push(gap);
    }
    return ranked;
  }

  updateWeights(newWeights: Partial<WeightsConfig>): void {
    this.weights = { ...this.weights, ...newWeights };
  }

  getWeights(): WeightsConfig {
    return { ...this.weights };
  }

  recordRepair(record: GapRepairRecord): void {
    this.repairHistory.push(record);
  }

  getRepairHistory(): GapRepairRecord[] {
    return [...this.repairHistory];
  }

  getRepairSuccessRate(): number {
    if (this.repairHistory.length === 0) return 0;
    const successes = this.repairHistory.filter(r => r.success).length;
    return successes / this.repairHistory.length;
  }

  getRepairsByModule(module: string): GapRepairRecord[] {
    return this.repairHistory.filter(r => r.module === module);
  }
}

let defaultPrioritizer: GapPrioritizer | null = null;

export function getGapPrioritizer(weights?: Partial<WeightsConfig>): GapPrioritizer {
  if (!defaultPrioritizer) defaultPrioritizer = new GapPrioritizer(weights);
  return defaultPrioritizer;
}

export function scoreGap(gap: CoverageGap): number {
  return getGapPrioritizer().scoreGap(gap);
}

export function prioritizeGaps(gaps: CoverageGap[]): CoverageGap[] {
  return getGapPrioritizer().prioritizeGaps(gaps);
}

export function rankBySeverity(gaps: CoverageGap[]): Record<GapSeverity, CoverageGap[]> {
  return getGapPrioritizer().rankBySeverity(gaps);
}
