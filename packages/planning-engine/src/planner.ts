import { randomUUID } from 'crypto';
import { createLogger } from '@ideia/logger';
import { Plan, PlannedStep, DecompositionStrategy, PlanStatus, RiskAssessment, CostEstimate } from './types';
import { AdaptiveDecomposer } from './decomposer';
import { DependencyAnalyzer } from './dependency-analyzer';
import { RiskEstimator } from './risk-estimator';
import { CostEstimator } from './cost-estimator';
import { FallbackPlanner } from './fallback-planner';
import { DynamicReplanner } from './replanner';

export interface PlanningEngineConfig {
  environment: string;
  defaultStrategy: DecompositionStrategy;
  maxSteps: number;
  autoAnalyzeDependencies: boolean;
  autoEstimateRisk: boolean;
  autoEstimateCost: boolean;
  autoGenerateFallbacks: boolean;
}

const DEFAULT_CONFIG: PlanningEngineConfig = {
  environment: 'dev',
  defaultStrategy: 'hybrid',
  maxSteps: 10,
  autoAnalyzeDependencies: true,
  autoEstimateRisk: true,
  autoEstimateCost: true,
  autoGenerateFallbacks: true,
};

export class PlanningEngine {
  private plans: Map<string, Plan> = new Map();
  readonly decomposer: AdaptiveDecomposer;
  readonly dependencyAnalyzer: DependencyAnalyzer;
  readonly riskEstimator: RiskEstimator;
  readonly costEstimator: CostEstimator;
  readonly fallbackPlanner: FallbackPlanner;
  readonly replanner: DynamicReplanner;
  readonly config: PlanningEngineConfig;

  constructor(config?: Partial<PlanningEngineConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.decomposer = new AdaptiveDecomposer({ maxSteps: this.config.maxSteps });
    this.dependencyAnalyzer = new DependencyAnalyzer();
    this.riskEstimator = new RiskEstimator();
    this.costEstimator = new CostEstimator();
    this.fallbackPlanner = new FallbackPlanner();
    this.replanner = new DynamicReplanner();
  }

  createPlan(goal: string, strategy?: DecompositionStrategy): Plan {
    const id = randomUUID();
    const planStrategy = strategy ?? this.config.defaultStrategy;

    const { steps: rawSteps } = this.decomposer.decompose(goal, planStrategy);

    let steps = rawSteps;

    if (this.config.autoAnalyzeDependencies) {
      const result = this.dependencyAnalyzer.analyze(steps);
      steps = result.steps;
    }

    if (this.config.autoEstimateRisk) {
      steps = steps.map(s => ({
        ...s,
        risk: this.riskEstimator.estimate(s, this.config.environment),
      }));
    }

    if (this.config.autoEstimateCost) {
      steps = steps.map(s => ({
        ...s,
        cost: this.costEstimator.estimate(s),
      }));
    }

    if (this.config.autoGenerateFallbacks) {
      steps = steps.map(s => {
        const fallbacks = this.fallbackPlanner.generateFallback(s);
        return fallbacks.length > 0 ? { ...s, fallbackPlan: fallbacks } : s;
      });
    }

    const totalRisk = this.riskEstimator.estimatePlanRisk(steps);
    const totalCost = this.costEstimator.estimateTotal(steps);

    const now = new Date().toISOString();
    const plan: Plan = {
      id,
      goal,
      strategy: planStrategy,
      steps,
      status: 'draft',
      risk: totalRisk,
      totalCost,
      createdAt: now,
      updatedAt: now,
      metadata: { environment: this.config.environment },
    };

    this.plans.set(id, plan);
    return { ...plan };
  }

  getPlan(planId: string): Plan | undefined {
    const plan = this.plans.get(planId);
    return plan ? { ...plan } : undefined;
  }

  updateStepStatus(planId: string, stepId: string, status: PlannedStep['status']): Plan {
    const plan = this.plans.get(planId);
    if (!plan) throw new Error(`Plan not found: ${planId}`);

    plan.steps = plan.steps.map(s => (s.id === stepId ? { ...s, status } : s));
    plan.updatedAt = new Date().toISOString();

    const allDone = plan.steps.every(s => s.status === 'completed' || s.status === 'skipped');
    const anyFailed = plan.steps.some(s => s.status === 'failed');

    if (allDone && !anyFailed) plan.status = 'completed';
    else if (anyFailed) plan.status = 'failed';

    this.plans.set(planId, plan);
    return { ...plan };
  }

  updatePlanStatus(planId: string, status: PlanStatus): Plan {
    const plan = this.plans.get(planId);
    if (!plan) throw new Error(`Plan not found: ${planId}`);
    plan.status = status;
    plan.updatedAt = new Date().toISOString();
    this.plans.set(planId, plan);
    return { ...plan };
  }

  replan(planId: string, failedStepId: string): Plan {
    const plan = this.plans.get(planId);
    if (!plan) throw new Error(`Plan not found: ${planId}`);

    const failedStep = plan.steps.find(s => s.id === failedStepId);
    if (!failedStep) throw new Error(`Step not found: ${failedStepId}`);

    const remainingSteps = plan.steps.slice(plan.steps.indexOf(failedStep));
    const newSteps = this.replanner.replanAfterFailure(failedStep, remainingSteps, plan.goal);

    const beforeSteps = plan.steps.slice(0, plan.steps.indexOf(failedStep));
    plan.steps = [...beforeSteps, ...newSteps];
    plan.status = 'draft';
    plan.updatedAt = new Date().toISOString();

    plan.totalCost = this.costEstimator.estimateTotal(plan.steps);
    plan.risk = this.riskEstimator.estimatePlanRisk(plan.steps);

    this.plans.set(planId, plan);
    return { ...plan };
  }

  listPlans(status?: PlanStatus): Plan[] {
    const all = Array.from(this.plans.values());
    if (status) return all.filter(p => p.status === status).map(p => ({ ...p }));
    return all.map(p => ({ ...p }));
  }

  deletePlan(planId: string): void {
    this.plans.delete(planId);
  }
}
