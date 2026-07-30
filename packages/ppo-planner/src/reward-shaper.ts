import { PlanExecution } from './types';
import { createLogger } from '@ideia/logger';
const logger = createLogger('reward-shaper');

export class RewardShaper {
  private readonly _weights = { completion: 0.30, efficiency: 0.25, stability: 0.20, quality: 0.15, speed: 0.10 };

  compute(execution: PlanExecution): number {
    const completion = execution.totalSteps > 0 ? execution.completedSteps / execution.totalSteps : 0;
    const efficiency = execution.actualTokens > 0 ? Math.min(1, execution.estimatedTokens / execution.actualTokens) : 0;
    const stability = execution.totalSteps > 0 ? Math.max(0, 1 - execution.replanCount / execution.totalSteps) : 0;
    const quality = execution.qualityScore ?? 0;
    const speed = execution.estimatedTimeMs > 0 ? Math.min(1, execution.estimatedTimeMs / Math.max(execution.wallTimeMs, 1)) : 0;
    const raw = completion * this._weights.completion + efficiency * this._weights.efficiency + stability * this._weights.stability + quality * this._weights.quality + speed * this._weights.speed;
    return this._normalizeReward(raw);
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
