import { Goal } from './types';
import { createLogger } from '@ideia/logger';
import { TokenCostEstimator } from './token-cost-estimator';
const logger = createLogger('time-cost-estimator');

export class TimeCostEstimator {
  private _tokenEstimator: TokenCostEstimator;

  constructor() {
    this._tokenEstimator = new TokenCostEstimator();
  }

  estimate(goal: Goal, depth: string, tokensPerSecond = 50): number {
    const tokens = this._tokenEstimator.estimate(goal, depth);
    const overhead = 2;
    return tokens / tokensPerSecond + overhead;
  }

  estimateByTokens(tokens: number, tokensPerSecond = 50): number {
    return tokens / tokensPerSecond + 2;
  }

  estimateMemory(goal: Goal): number {
    const baseMem = 50;
    const goalMem = goal.complexity * 100;
    const fileMem = (goal.fileCount ?? 0) * 2;
    return baseMem + goalMem + fileMem;
  }
}
