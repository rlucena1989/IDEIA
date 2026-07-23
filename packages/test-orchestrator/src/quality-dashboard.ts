export type QualityDimension = 'code' | 'security' | 'performance' | 'ux' | 'integration' | 'resilience' | 'data';

export interface DimensionScore {
  dimension: QualityDimension;
  score: number;
  weight: number;
  details: string[];
}

export interface GateStatus {
  name: string;
  passed: boolean;
  required: boolean;
  score: number;
  lastRun?: string;
}

export interface QualityReport {
  timestamp: string;
  dimensions: DimensionScore[];
  overallScore: number;
  gates: GateStatus[];
  history: HistoryEntry[];
}

export interface HistoryEntry {
  timestamp: string;
  overallScore: number;
  dimensions: Partial<Record<QualityDimension, number>>;
}

const DIMENSION_WEIGHTS: Record<QualityDimension, number> = {
  code: 0.2,
  security: 0.2,
  performance: 0.1,
  ux: 0.1,
  integration: 0.15,
  resilience: 0.15,
  data: 0.1,
};

export class QualityDashboard {
  private history: HistoryEntry[] = [];
  private maxHistory = 30;

  computeScore(dimension: QualityDimension, metrics: {
    testPassRate?: number;
    coverage?: number;
    lintErrors?: number;
    vulns?: number;
    ttft?: number;
  }): DimensionScore {
    const details: string[] = [];
    let score = 100;

    switch (dimension) {
      case 'code': {
        if (metrics.testPassRate !== undefined) {
          score = metrics.testPassRate;
          details.push(`Tests: ${metrics.testPassRate.toFixed(0)}% pass rate`);
        }
        if (metrics.coverage !== undefined) {
          score = (score + metrics.coverage) / 2;
          details.push(`Coverage: ${metrics.coverage.toFixed(0)}%`);
        }
        if (metrics.lintErrors !== undefined && metrics.lintErrors > 0) {
          score = Math.max(0, score - metrics.lintErrors * 2);
          details.push(`Lint: ${metrics.lintErrors} errors (-${metrics.lintErrors * 2}pts)`);
        }
        break;
      }
      case 'security': {
        if (metrics.vulns !== undefined) {
          score = Math.max(0, 100 - metrics.vulns * 10);
          details.push(`Vulnerabilities: ${metrics.vulns} (-${metrics.vulns * 10}pts)`);
        }
        if (metrics.lintErrors !== undefined && metrics.lintErrors > 0) {
          score = Math.max(0, score - metrics.lintErrors * 5);
          details.push(`Security lint errors: ${metrics.lintErrors}`);
        }
        break;
      }
      case 'performance': {
        if (metrics.ttft !== undefined) {
          score = metrics.ttft < 100 ? 90 : metrics.ttft < 500 ? 70 : metrics.ttft < 2000 ? 50 : 30;
          details.push(`TTFT: ${metrics.ttft}ms (score: ${score})`);
        }
        break;
      }
      default:
        score = metrics.testPassRate ?? 80;
        details.push(`Default score based on test pass rate: ${score}%`);
    }

    return {
      dimension,
      score: Math.round(score),
      weight: DIMENSION_WEIGHTS[dimension],
      details,
    };
  }

  getOverallScore(dimensions: DimensionScore[]): number {
    if (dimensions.length === 0) return 0;
    const totalWeight = dimensions.reduce((s, d) => s + d.weight, 0);
    if (totalWeight === 0) return 0;
    const weighted = dimensions.reduce((s, d) => s + (d.score * d.weight), 0);
    return Math.round(weighted / totalWeight);
  }

  getGatesStatus(suiteResults: Array<{ name: string; passed: boolean }>): GateStatus[] {
    const gateMap: Record<string, { required: boolean; score: number }> = {
      lint: { required: false, score: 80 },
      typecheck: { required: true, score: 90 },
      'test:unit': { required: true, score: 70 },
      'test:integration': { required: false, score: 50 },
      'test:contract': { required: false, score: 50 },
      security: { required: false, score: 80 },
    };

    return suiteResults.map(r => ({
      name: r.name,
      passed: r.passed,
      required: gateMap[r.name]?.required ?? false,
      score: gateMap[r.name]?.score ?? 50,
      lastRun: new Date().toISOString(),
    }));
  }

  recordHistory(overallScore: number, dimensions: DimensionScore[]): void {
    const entry: HistoryEntry = {
      timestamp: new Date().toISOString(),
      overallScore,
      dimensions: Object.fromEntries(dimensions.map(d => [d.dimension, d.score])) as Partial<Record<QualityDimension, number>>,
    };
    this.history.push(entry);
    if (this.history.length > this.maxHistory) {
      this.history = this.history.slice(-this.maxHistory);
    }
  }

  getHistory(): HistoryEntry[] {
    return [...this.history];
  }

  generateReport(suiteResults: Array<{ name: string; passed: boolean }>, metrics: Parameters<QualityDashboard['computeScore']>[1]): QualityReport {
    const dimensions: QualityDimension[] = ['code', 'security', 'performance', 'integration', 'resilience', 'data'];
    const dimensionScores = dimensions.map(d => this.computeScore(d, metrics));
    const overall = this.getOverallScore(dimensionScores);
    const gates = this.getGatesStatus(suiteResults);

    this.recordHistory(overall, dimensionScores);

    return {
      timestamp: new Date().toISOString(),
      dimensions: dimensionScores,
      overallScore: overall,
      gates,
      history: this.getHistory(),
    };
  }
}

export function createQualityDashboard(): QualityDashboard {
  return new QualityDashboard();
}
