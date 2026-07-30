import { Goal } from './types';
import { createLogger } from '@ideia/logger';
const logger = createLogger('token-cost-estimator');

export class TokenCostEstimator {
  estimate(goal: Goal, depth: string): number {
    const baseContext = 2000;
    const depthMultiplier: Record<string, number> = { none: 0, shallow: 0.3, medium: 0.6, deep: 1.0 };
    const multiplier = depthMultiplier[depth] ?? 0.5;
    const analysisTokens = goal.complexity * 3000 * multiplier;
    const generationTokens = (goal.stepCount ?? 5) * 500 * multiplier;
    return baseContext + analysisTokens + generationTokens;
  }

  estimateContextSize(goal: Goal): number {
    const descriptionTokens = goal.description.length / 2;
    const fileTokens = (goal.fileCount ?? 0) * 200;
    const dependencyTokens = (goal.stepCount ?? 5) * 100;
    return descriptionTokens + fileTokens + dependencyTokens;
  }

  estimateByFiles(fileCount: number, averageTokensPerFile = 200): number {
    return fileCount * averageTokensPerFile + 1000;
  }
}
