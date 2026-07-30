import { GateResult, ConfidenceScore, VerificationLayer } from './types';
import { createLogger } from '@ideia/logger';
const logger = createLogger('confidence-scorer');

export interface ConfidenceScoreConfig {
  layerWeights: Record<VerificationLayer, number>;
  criticalPenalty: number;
  failurePenalty: number;
}

const DEFAULT_CONFIG: ConfidenceScoreConfig = {
  layerWeights: { syntax: 1, semantic: 2, functional: 3, systemic: 2, contextual: 1 },
  criticalPenalty: 30,
  failurePenalty: 15,
};

export class ConfidenceScorer {
  private config: ConfidenceScoreConfig;

  constructor(config?: Partial<ConfidenceScoreConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  calculate(results: GateResult[]): ConfidenceScore {
    const byLayer = new Map<VerificationLayer, GateResult[]>();
    for (const r of results) {
      const existing = byLayer.get(r.layer) ?? [];
      existing.push(r);
      byLayer.set(r.layer, existing);
    }

    const layerScores: Record<string, number> = {};
    let totalWeight = 0;
    let weightedScore = 0;

    for (const [layer, gates] of byLayer) {
      const weight = this.config.layerWeights[layer] ?? 1;
      const passed = gates.filter(g => g.status === 'passed').length;
      const layerScore = gates.length > 0 ? Math.round((passed / gates.length) * 100) : 0;
      layerScores[layer] = layerScore;
      weightedScore += layerScore * weight;
      totalWeight += weight;
    }

    const gatesPassed = results.filter(r => r.status === 'passed').length;
    const criticalFailures = results.filter(r => r.severity === 'critical' && r.status === 'failed').length;

    let score = totalWeight > 0 ? Math.round(weightedScore / totalWeight) : 0;
    score -= criticalFailures * this.config.criticalPenalty;
    score -= (results.length - gatesPassed - criticalFailures) * this.config.failurePenalty;
    score = Math.max(0, Math.min(100, score));

    return {
      overall: score,
      byLayer: layerScores as Record<VerificationLayer, number>,
      gatesPassed,
      gatesTotal: results.length,
      criticalFailures,
      score,
    };
  }

  interpret(score: number): { label: string; canProceed: boolean } {
    if (score >= 90) return { label: 'excelente', canProceed: true };
    if (score >= 70) return { label: 'bom', canProceed: true };
    if (score >= 50) return { label: 'regular', canProceed: false };
    if (score >= 30) return { label: 'ruim', canProceed: false };
    return { label: 'critico', canProceed: false };
  }
}
