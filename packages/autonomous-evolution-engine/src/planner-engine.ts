import { Logger } from '@ideia/logger';
import { PrioritizedRecommendation, ExecutionStep, EvolutionPlan, MetricsBottleneck } from './types';

export interface OptimizationPlan {
  id: string;
  bottleneck: MetricsBottleneck;
  steps: ExecutionStep[];
  dependencies: string[];
  totalEffortMs: number;
  riskScore: number;
  createdAt: number;
}

export class PlannerEngine {
  private logger: Logger;
  private stepCounter: number;

  constructor(logger: Logger) {
    this.logger = logger;
    this.stepCounter = 0;
  }

  createPlan(recommendations: PrioritizedRecommendation[]): EvolutionPlan {
    const steps = this.buildSteps(recommendations);
    const totalEffortMs = steps.reduce((sum, s) => sum + s.estimatedMs, 0);
    const riskScore = this.getRiskScore(steps);

    const plan: EvolutionPlan = {
      id: `plan-${Date.now()}`,
      steps,
      totalEffortMs,
      riskScore,
      createdAt: Date.now(),
    };

    this.logger.info(
      `Plan ${plan.id} — ${steps.length} steps, ${(totalEffortMs / 60000).toFixed(1)}min, risk ${riskScore}`
    );

    return plan;
  }

  generateOptimizationPlan(bottleneck: MetricsBottleneck, recommendations: PrioritizedRecommendation[]): OptimizationPlan {
    const steps = this.buildSteps(recommendations);
    const totalEffortMs = steps.reduce((sum, s) => sum + s.estimatedMs, 0);
    const dependencies = recommendations.map(r => r.action);

    return {
      id: `opt-${Date.now()}`,
      bottleneck,
      steps,
      dependencies,
      totalEffortMs,
      riskScore: this.getRiskScore(steps),
      createdAt: Date.now(),
    };
  }

  estimateEffort(plan: EvolutionPlan): { minutes: number; hours: number; days: number } {
    const ms = plan.totalEffortMs;
    return {
      minutes: Math.round(ms / 60000),
      hours: Math.round(ms / 3600000),
      days: Math.round(ms / 86400000),
    };
  }

  getRiskScore(steps: ExecutionStep[]): number {
    if (steps.length === 0) return 0;
    const weights = { low: 0.1, medium: 0.3, high: 0.6 };
    const totalWeight = steps.reduce((sum, s) => sum + weights[s.risk], 0);
    return Math.min(1, totalWeight / steps.length + steps.length * 0.02);
  }

  private buildSteps(recommendations: PrioritizedRecommendation[]): ExecutionStep[] {
    const steps: ExecutionStep[] = [];
    const effortMs: Record<string, number> = {
      minutes: 60000,
      hours: 3600000,
      days: 28800000,
      sprint: 432000000,
    };

    for (const rec of recommendations.slice(0, 10)) {
      this.stepCounter++;
      const risk = rec.effort === 'sprint' ? 'high' : rec.effort === 'days' ? 'medium' : 'low';
      steps.push({
        id: `step-${this.stepCounter}-${Date.now()}`,
        description: rec.action,
        action: `apply:${rec.category}`,
        target: rec.category,
        estimatedMs: effortMs[rec.effort] ?? 60000,
        risk,
      });
    }

    return steps;
  }
}
