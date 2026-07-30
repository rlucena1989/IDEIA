import { EarlyExitDecision, Evidence, TaskType } from '../types';
import { createLogger } from '@ideia/logger';
const logger = createLogger('early-exit');

export interface EarlyExitConfig {
  minConfidence: number;
  requiredEvidence: number;
  typeThresholds: Record<string, number>;
}

const DEFAULT_CONFIG: EarlyExitConfig = {
  minConfidence: 0.85,
  requiredEvidence: 2,
  typeThresholds: {
    question: 0.9,
    bugfix: 0.8,
    feature: 0.7,
    documentation: 0.85,
    review: 0.8,
    refactor: 0.7,
    test: 0.75,
    devops: 0.6,
    unknown: 0.95,
  },
};

export class EarlyExitDecider {
  private config: EarlyExitConfig;

  constructor(config: Partial<EarlyExitConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  shouldExit(taskType: TaskType, evidence: Evidence[]): EarlyExitDecision {
    const threshold = this.config.typeThresholds[taskType] ?? this.config.minConfidence;

    const highConfidence = evidence.filter(e => e.confidence >= threshold);
    const totalConfidence = evidence.reduce((sum, e) => sum + e.confidence, 0);
    const avgConfidence = evidence.length > 0 ? totalConfidence / evidence.length : 0;

    if (highConfidence.length >= this.config.requiredEvidence && avgConfidence >= threshold) {
      return {
        shouldExit: true,
        reason: `Evidência suficiente: ${highConfidence.length}/${evidence.length} itens com confiança >= ${threshold}`,
        confidence: avgConfidence,
        evidence: evidence.map(e => `${e.type}: ${String(e.value)} (${Math.round(e.confidence * 100)}%)`),
      };
    }

    if (evidence.length === 0) {
      return {
        shouldExit: false,
        reason: 'Nenhuma evidência coletada',
        confidence: 0,
        evidence: [],
      };
    }

    return {
      shouldExit: false,
      reason: `Evidência insuficiente: ${highConfidence.length}/${this.config.requiredEvidence} itens de alta confiança necessários`,
      confidence: avgConfidence,
      evidence: evidence.map(e => `${e.type}: ${String(e.value)} (${Math.round(e.confidence * 100)}%)`),
    };
  }

  setConfig(config: Partial<EarlyExitConfig>): void {
    this.config = { ...this.config, ...config };
  }
}
