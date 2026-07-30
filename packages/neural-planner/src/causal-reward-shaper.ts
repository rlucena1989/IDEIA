import { PlanExecution } from './types';
import { createLogger } from '@ideia/logger';
const logger = createLogger('causal-reward-shaper');

export class CausalRewardShaper {
  compute(execution: PlanExecution): number {
    const completionRate = execution.totalSteps > 0 ? execution.completedSteps / execution.totalSteps : 0;
    const tokenEfficiency = execution.actualTokens > 0
      ? Math.min(1, execution.estimatedTokens / execution.actualTokens) : 0;
    const stability = execution.totalSteps > 0
      ? Math.max(0, 1 - execution.replanCount / execution.totalSteps) : 0;
    const quality = execution.qualityScore ?? 0;
    const planningOverhead = execution.actualTokens > 0
      ? execution.estimatedTokens / execution.actualTokens : 0;
    const planningPenalty = Math.max(0, planningOverhead - 0.3);
    return completionRate * 0.35 + tokenEfficiency * 0.15 + stability * 0.15 + quality * 0.25 - planningPenalty * 0.10;
  }

  shape(stepReward: number, progress: number): number {
    const progressBonus = progress > 0.5 ? 0.1 : 0;
    const completionBonus = progress >= 1.0 ? 0.5 : 0;
    return stepReward + progressBonus + completionBonus;
  }

  private _normalizeReward(raw: number): number {
    return Math.max(-1, Math.min(1, (raw - 0.5) * 2));
  }
}
