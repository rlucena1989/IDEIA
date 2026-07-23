import { Budget } from './types';

export function estimateBudget(depth: number, estimatedTokens: number): Budget {
  const costPerToken = 0.000003;
  return {
    tokensMax: Math.max(estimatedTokens * 2, 10000),
    costMaxUsd: Math.round(estimatedTokens * costPerToken * 2 * 100) / 100,
    latencyMaxMs: depth <= 2 ? 10000 : depth <= 4 ? 30000 : 120000,
    depthMax: depth
  };
}

export function mergeBudgets(budgets: Budget[]): Budget {
  return {
    tokensMax: budgets.reduce((a, b) => a + b.tokensMax, 0),
    costMaxUsd: budgets.reduce((a, b) => a + b.costMaxUsd, 0),
    latencyMaxMs: Math.max(...budgets.map(b => b.latencyMaxMs)),
    depthMax: Math.max(...budgets.map(b => b.depthMax))
  };
}

export function budgetToString(b: Budget): string {
  return `tokens=${b.tokensMax} cost=$${b.costMaxUsd.toFixed(2)} latency=${b.latencyMaxMs}ms depth=${b.depthMax}`;
}
