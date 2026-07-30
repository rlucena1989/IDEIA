import { ComplianceFramework, ControlStatus, type ComplianceScore, type ControlRecord } from './types';
import { createLogger } from '@ideia/logger';
const logger = createLogger('score-calculator');

export class ComplianceScoreCalculator {
  private controls: ControlRecord[];

  constructor(controls: ControlRecord[]) {
    this.controls = controls;
  }

  calculate(framework: ComplianceFramework): ComplianceScore {
    const frameworkControls = this.controls.filter(
      c => c.framework === framework
    );
    const applicable = frameworkControls.filter(
      c => c.status !== ControlStatus.not_applicable
    );
    const total = applicable.length;

    if (total === 0) {
      return {
        framework,
        total: 0,
        implemented: 0,
        partial: 0,
        missing: 0,
        score: 0,
        level: 'F',
      };
    }

    const implemented = applicable.filter(
      c => c.status === ControlStatus.implemented
    ).length;
    const partial = applicable.filter(
      c => c.status === ControlStatus.partial
    ).length;
    const missing = applicable.filter(
      c => c.status === ControlStatus.missing
    ).length;

    const rawScore =
      (implemented * 100 + partial * 50 + missing * 0) / total;
    const score = Math.round(rawScore * 100) / 100;

    return {
      framework,
      total,
      implemented,
      partial,
      missing,
      score,
      level: this.getLevel(score),
    };
  }

  getScore(framework: ComplianceFramework): number {
    return this.calculate(framework).score;
  }

  getLevel(score: number): string {
    if (score >= 90) return 'A';
    if (score >= 75) return 'B';
    if (score >= 60) return 'C';
    if (score >= 40) return 'D';
    return 'F';
  }
}
