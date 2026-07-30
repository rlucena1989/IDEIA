import { LLMCallRecord, AnalyticsConfig, AgentBudgetUsage, TokenBudget, Period } from './types-analytics';
import { createLogger } from '@ideia/logger';
const logger = createLogger('cost-tracker');

export class CostTracker {
  private records: LLMCallRecord[] = [];

  constructor(private config: AnalyticsConfig) {}

  recordCall(record: LLMCallRecord): void {
    this.records.push(record);
  }

  getTotalCost(): number {
    return this.records.reduce((sum, r) => sum + r.cost, 0);
  }

  getCostByProvider(provider: string): number {
    return this.records
      .filter(r => r.provider === provider)
      .reduce((sum, r) => sum + r.cost, 0);
  }

  getCostByAgent(agentId: string): number {
    return this.records
      .filter(r => r.agentId === agentId)
      .reduce((sum, r) => sum + r.cost, 0);
  }

  getCostByTask(taskType: string): number {
    return this.records
      .filter(r => r.taskType === taskType)
      .reduce((sum, r) => sum + r.cost, 0);
  }

  getBudgetUsage(agentId: string, budget: TokenBudget): AgentBudgetUsage {
    const periodMs = this.getPeriodMs(budget.period);
    const now = Date.now();
    const periodStart = now - periodMs;
    const periodEnd = now;

    const agentRecords = this.records.filter(r =>
      r.agentId === agentId &&
      r.timestamp >= periodStart &&
      r.timestamp <= periodEnd
    );

    const totalTokens = agentRecords.reduce((sum, r) => sum + r.totalTokens, 0);
    const totalCost = agentRecords.reduce((sum, r) => sum + r.cost, 0);

    const sourceMap = new Map<string, { tokens: number; cost: number }>();
    for (const record of agentRecords) {
      for (const source of record.contextSources) {
        const existing = sourceMap.get(source.source);
        const perTokenCost = (this.config.providerCostPer1K[record.provider] || 0) / 1000;
        const cost = source.tokensProvided * perTokenCost;
        if (existing) {
          existing.tokens += source.tokensProvided;
          existing.cost += cost;
        } else {
          sourceMap.set(source.source, { tokens: source.tokensProvided, cost });
        }
      }
    }

    const topSources = Array.from(sourceMap.entries())
      .map(([source, stats]) => ({ source, tokens: stats.tokens, cost: stats.cost }))
      .sort((a, b) => b.tokens - a.tokens)
      .slice(0, 5);

    const percentUsed = budget.hardLimit > 0 ? totalTokens / budget.hardLimit : 0;

    const recommendations: string[] = [];
    if (totalTokens > budget.hardLimit) {
      recommendations.push('Hard limit exceeded - reduce token usage');
    } else if (totalTokens > budget.softLimit) {
      recommendations.push('Soft limit exceeded - consider optimization');
    }
    if (totalCost > 5) {
      recommendations.push('High cost detected - switch to lower-cost provider for non-critical tasks');
    }
    if (recommendations.length === 0) {
      recommendations.push('Usage is within budget');
    }

    return {
      agentId,
      periodStart,
      periodEnd,
      totalTokens,
      totalCost,
      budget,
      percentUsed,
      topSources,
      recommendations,
    };
  }

  forecastCost(period: Period): number {
    if (this.records.length === 0) return 0;

    const timestamps = this.records.map(r => r.timestamp);
    const oldest = Math.min(...timestamps);
    const newest = Math.max(...timestamps);
    const elapsedMs = (newest - oldest) || 1;
    const elapsedDays = elapsedMs / (24 * 60 * 60 * 1000);

    const totalCost = this.getTotalCost();
    const avgDailyCost = totalCost / Math.max(elapsedDays, 1);

    const daysInPeriod = this.getPeriodDays(period);
    return avgDailyCost * daysInPeriod;
  }

  clear(period?: Period): void {
    if (!period) {
      this.records = [];
      return;
    }
    const periodMs = this.getPeriodMs(period);
    const cutoff = Date.now() - periodMs;
    this.records = this.records.filter(r => r.timestamp > cutoff);
  }

  private getPeriodMs(period: Period): number {
    switch (period) {
      case 'daily': return 86400000;
      case 'weekly': return 604800000;
      case 'monthly': return 2592000000;
    }
  }

  private getPeriodDays(period: Period): number {
    switch (period) {
      case 'daily': return 1;
      case 'weekly': return 7;
      case 'monthly': return 30;
    }
  }
}
