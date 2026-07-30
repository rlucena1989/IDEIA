import { Goal, PlanningContext, ROIResult, Scenario } from './types';
import { createLogger } from '@ideia/logger';
const logger = createLogger('roi-calculator');

class PlanningCostModel {
  estimatePlanCost(goal: Goal, _context?: PlanningContext): { base: number; complexity: number; files: number; dependencies: number; overhead: number; retries: number; total: number; estimatedSeconds: number; tokenBreakdown: { contextTokens: number; analysisTokens: number; generationTokens: number } } {
    const contextTokens = 2000;
    const complexityCost = goal.complexity * 1500;
    const fileCost = (goal.fileCount ?? 1) * 100;
    const dependencyCost = (goal.stepCount ?? 1) * 200;
    const total = contextTokens + complexityCost + fileCost + dependencyCost;
    return {
      base: contextTokens, complexity: complexityCost, files: fileCost, dependencies: dependencyCost,
      overhead: 0, retries: 0, total, estimatedSeconds: total / 50,
      tokenBreakdown: { contextTokens, analysisTokens: complexityCost + dependencyCost, generationTokens: fileCost },
    };
  }

  estimateExecCost(goal: Goal, withPlan: boolean): { base: number; complexity: number; files: number; dependencies: number; overhead: number; retries: number; total: number; estimatedSeconds: number; tokenBreakdown: { contextTokens: number; analysisTokens: number; generationTokens: number } } {
    const baseExec = goal.complexity * 3000;
    if (withPlan) {
      const retries = Math.floor(baseExec * 0.1);
      const total = baseExec + retries;
      return { base: baseExec, complexity: 0, files: 0, dependencies: 0, overhead: 0, retries, total, estimatedSeconds: total / 50, tokenBreakdown: { contextTokens: baseExec, analysisTokens: 0, generationTokens: retries } };
    }
    const overhead = Math.floor(baseExec * (goal.complexity > 0.7 ? 0.4 : 0.3));
    const retries = Math.floor(baseExec * (goal.complexity > 0.7 ? 0.3 : 0.2));
    const total = baseExec + overhead + retries;
    return { base: baseExec, complexity: 0, files: 0, dependencies: 0, overhead, retries, total, estimatedSeconds: total * 1.5 / 50, tokenBreakdown: { contextTokens: baseExec, analysisTokens: overhead, generationTokens: retries } };
  }
}

export class ROICalculator {
  private readonly _minROIThreshold = 0.20;

  compute(goal: Goal, context: PlanningContext): ROIResult {
    const costModel = new PlanningCostModel();
    const planCost = costModel.estimatePlanCost(goal, context);
    const execWithoutPlan = costModel.estimateExecCost(goal, false);
    const execWithPlan = costModel.estimateExecCost(goal, true);
    const savings = execWithoutPlan.total - execWithPlan.total - planCost.total;
    const roi = planCost.total > 0 ? savings / planCost.total : 0;
    const breakEvenPlans = Math.max(1, Math.ceil(planCost.total / Math.max(execWithoutPlan.total - execWithPlan.total, 1)));
    const confidence = context.historyLength > 50 ? 'high' : context.historyLength > 20 ? 'medium' : 'low';
    return {
      shouldPlan: roi > this._minROIThreshold,
      roi: Math.round(roi * 100) / 100,
      savings: Math.round(savings),
      breakEvenPlans,
      planCost,
      execCostWithoutPlan: execWithoutPlan,
      execCostWithPlan: execWithPlan,
      recommendedDepth: this._recommendDepth(roi, goal.complexity),
      confidence,
      alternativeScenarios: this._sensitivityAnalysis(roi, planCost.total),
    };
  }

  private _recommendDepth(roi: number, complexity: number): 'none' | 'shallow' | 'medium' | 'deep' {
    if (roi < 0.2) return 'none';
    if (roi < 0.5) return 'shallow';
    if (roi < 1.0) return 'medium';
    if (complexity > 0.7) return 'deep';
    if (complexity > 0.5) return 'medium';
    return 'shallow';
  }

  private _sensitivityAnalysis(baseRoi: number, planCost: number): Scenario[] {
    return [
      { name: 'optimistic', description: 'Plan cost 20% lower than estimated', roi: (baseRoi * planCost) / (planCost * 0.8), probability: 0.2 },
      { name: 'pessimistic', description: 'Exec without plan 20% cheaper', roi: baseRoi * 0.7, probability: 0.3 },
      { name: 'expected', description: 'Base case as estimated', roi: baseRoi, probability: 0.5 },
    ];
  }
}
