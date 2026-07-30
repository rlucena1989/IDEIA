import { PlannedStep, CostEstimate } from './types';
import { createLogger } from '@ideia/logger';
const logger = createLogger('cost-estimator');

export interface CostEstimatorConfig {
  tokensPerSecond: number;
  baseCostPerStep: number;
  roleCostMultiplier: Record<string, number>;
}

const DEFAULT_CONFIG: CostEstimatorConfig = {
  tokensPerSecond: 10,
  baseCostPerStep: 500,
  roleCostMultiplier: { analyst: 0.5, architect: 1.0, programmer: 1.5, tester: 0.8, devops: 1.2 },
};

export class CostEstimator {
  private config: CostEstimatorConfig;

  constructor(config?: Partial<CostEstimatorConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  estimate(step: PlannedStep): CostEstimate {
    const roleMult = this.config.roleCostMultiplier[step.agentRole] ?? 1.0;
    const depMult = 1 + step.dependencies.length * 0.1;
    const criteriaMult = 1 + step.acceptanceCriteria.filter(c => c.mandatory).length * 0.2;

    const estimatedTokens = Math.round(this.config.baseCostPerStep * roleMult * depMult * criteriaMult);
    const estimatedSeconds = Math.round(estimatedTokens / this.config.tokensPerSecond);
    const confidence = this.calculateConfidence(step);

    return { estimatedTokens, estimatedSeconds, estimatedSteps: 1, confidence };
  }

  estimateTotal(steps: PlannedStep[]): CostEstimate {
    const estimates = steps.map(s => this.estimate(s));
    return {
      estimatedTokens: estimates.reduce((s, e) => s + e.estimatedTokens, 0),
      estimatedSeconds: estimates.reduce((s, e) => s + e.estimatedSeconds, 0),
      estimatedSteps: steps.length,
      confidence: estimates.reduce((s, e) => s + e.confidence, 0) / estimates.length,
    };
  }

  private calculateConfidence(step: PlannedStep): number {
    let confidence = 0.7;

    if (step.acceptanceCriteria.length > 0) confidence += 0.1;
    if (step.dependencies.length > 5) confidence -= 0.1;
    if (step.risk.level === 'critical') confidence -= 0.2;
    if (step.risk.level === 'high') confidence -= 0.1;

    return Math.max(0.1, Math.min(1, confidence));
  }
}
