import { createLogger } from '@ideia/logger';
import {
  LLMCallRecord,
  DashboardSummary,
  EfficiencyReport,
  WasteSource,
  AgentRanking,
  ProviderComparison,
  Alert,
  AlertSeverity,
  AlertType,
  Period,
  Provider,
} from './types-analytics';
import { TokenAnalyzer } from './token-analyzer';
import { CostTracker } from './cost-tracker';
import { OptimizationRecommender } from './optimization-recommender';
const logger = createLogger('dashboard');

export class AnalyticsDashboard {
  constructor(
    private analyzer: TokenAnalyzer,
    private costTracker: CostTracker,
    private recommender: OptimizationRecommender,
  ) {}

  getSummary(records: LLMCallRecord[], period?: Period): DashboardSummary {
    const relevant = period ? this.filterByPeriod(records, period) : records;

    const totalCalls = relevant.length;
    const totalTokens = relevant.reduce((sum, r) => sum + r.totalTokens, 0);
    const totalCost = relevant.reduce((sum, r) => sum + r.cost, 0);
    const averageCostPerCall = totalCalls > 0 ? totalCost / totalCalls : 0;

    const totalProvided = relevant.reduce((sum, r) =>
      sum + r.contextSources.reduce((s2, src) => s2 + src.tokensProvided, 0), 0);
    const totalReferenced = relevant.reduce((sum, r) =>
      sum + r.contextSources.reduce((s2, src) => s2 + src.tokensReferenced, 0), 0);
    const efficiency = totalProvided > 0 ? Math.min(totalReferenced / totalProvided, 1) : 0;

    const totalWaste = relevant.reduce((sum, r) =>
      sum + r.contextSources
        .filter(src => !src.wasReferenced)
        .reduce((s2, src) => s2 + src.tokensProvided, 0), 0);
    const wastePercent = totalTokens > 0 ? (totalWaste / totalTokens) * 100 : 0;

    const cacheHits = relevant.filter(r => r.cacheHit).length;
    const cacheHitRate = totalCalls > 0 ? cacheHits / totalCalls : 0;

    const providerMap = new Map<string, { calls: number; tokens: number }>();
    for (const r of relevant) {
      const existing = providerMap.get(r.provider);
      if (existing) {
        existing.calls++;
        existing.tokens += r.totalTokens;
      } else {
        providerMap.set(r.provider, { calls: 1, tokens: r.totalTokens });
      }
    }
    const topProviders = Array.from(providerMap.entries())
      .map(([provider, stats]) => ({
        provider: provider as Provider,
        calls: stats.calls,
        tokens: stats.tokens,
      }))
      .sort((a, b) => b.tokens - a.tokens);

    const agentMap = new Map<string, { tokens: number; cost: number }>();
    for (const r of relevant) {
      const existing = agentMap.get(r.agentId);
      if (existing) {
        existing.tokens += r.totalTokens;
        existing.cost += r.cost;
      } else {
        agentMap.set(r.agentId, { tokens: r.totalTokens, cost: r.cost });
      }
    }
    const topAgents = Array.from(agentMap.entries())
      .map(([agentId, stats]) => ({ agentId, tokens: stats.tokens, cost: stats.cost }))
      .sort((a, b) => b.tokens - a.tokens)
      .slice(0, 5);

    const timestamps = relevant.map(r => r.timestamp);
    const periodStart = timestamps.length > 0 ? Math.min(...timestamps) : 0;
    const periodEnd = timestamps.length > 0 ? Math.max(...timestamps) : 0;

    return {
      period: { start: periodStart, end: periodEnd },
      totalCalls,
      totalTokens,
      totalCost,
      averageCostPerCall,
      efficiency,
      wastePercent,
      cacheHitRate,
      topProviders,
      topAgents,
    };
  }

  getEfficiencyReport(records: LLMCallRecord[]): EfficiencyReport {
    const bySource: Record<string, number> = {};
    const byAgent: Record<string, number> = {};
    const byTaskType: Record<string, number> = {};
    const byProvider: Record<string, number> = {};

    const sourceData = new Map<string, { provided: number; referenced: number }>();
    const agentData = new Map<string, { provided: number; referenced: number }>();
    const taskData = new Map<string, { provided: number; referenced: number }>();
    const providerData = new Map<string, { provided: number; referenced: number }>();

    for (const record of records) {
      for (const source of record.contextSources) {
        const sExisting = sourceData.get(source.source);
        if (sExisting) {
          sExisting.provided += source.tokensProvided;
          sExisting.referenced += source.tokensReferenced;
        } else {
          sourceData.set(source.source, { provided: source.tokensProvided, referenced: source.tokensReferenced });
        }
      }

      const aExisting = agentData.get(record.agentId);
      const agentProvided = record.contextSources.reduce((s, src) => s + src.tokensProvided, 0);
      const agentReferenced = record.contextSources.reduce((s, src) => s + src.tokensReferenced, 0);
      if (aExisting) {
        aExisting.provided += agentProvided;
        aExisting.referenced += agentReferenced;
      } else {
        agentData.set(record.agentId, { provided: agentProvided, referenced: agentReferenced });
      }

      const tExisting = taskData.get(record.taskType);
      const taskProvided = record.contextSources.reduce((s, src) => s + src.tokensProvided, 0);
      const taskReferenced = record.contextSources.reduce((s, src) => s + src.tokensReferenced, 0);
      if (tExisting) {
        tExisting.provided += taskProvided;
        tExisting.referenced += taskReferenced;
      } else {
        taskData.set(record.taskType, { provided: taskProvided, referenced: taskReferenced });
      }

      const pExisting = providerData.get(record.provider);
      const providerProvided = record.contextSources.reduce((s, src) => s + src.tokensProvided, 0);
      const providerReferenced = record.contextSources.reduce((s, src) => s + src.tokensReferenced, 0);
      if (pExisting) {
        pExisting.provided += providerProvided;
        pExisting.referenced += providerReferenced;
      } else {
        providerData.set(record.provider, { provided: providerProvided, referenced: providerReferenced });
      }
    }

    for (const [source, data] of sourceData.entries()) {
      bySource[source] = data.provided > 0 ? Math.min(data.referenced / data.provided, 1) : 0;
    }
    for (const [agentId, data] of agentData.entries()) {
      byAgent[agentId] = data.provided > 0 ? Math.min(data.referenced / data.provided, 1) : 0;
    }
    for (const [taskType, data] of taskData.entries()) {
      byTaskType[taskType] = data.provided > 0 ? Math.min(data.referenced / data.provided, 1) : 0;
    }
    for (const [provider, data] of providerData.entries()) {
      byProvider[provider] = data.provided > 0 ? Math.min(data.referenced / data.provided, 1) : 0;
    }

    let totalProvided = 0;
    let totalReferenced = 0;
    for (const data of sourceData.values()) {
      totalProvided += data.provided;
      totalReferenced += data.referenced;
    }
    const overall = totalProvided > 0 ? Math.min(totalReferenced / totalProvided, 1) : 0;

    return { overall, bySource, byAgent, byTaskType, byProvider };
  }

  getTopWasteSources(records: LLMCallRecord[], limit: number = 10): WasteSource[] {
    const wasteMap = new Map<string, { wastedTokens: number; wastedCost: number }>();

    for (const record of records) {
      for (const source of record.contextSources) {
        if (source.wasReferenced) {
          continue;
        }
        const cost = source.tokensProvided * this.getPerTokenCost(record.provider);
        const existing = wasteMap.get(source.source);
        if (existing) {
          existing.wastedTokens += source.tokensProvided;
          existing.wastedCost += cost;
        } else {
          wasteMap.set(source.source, { wastedTokens: source.tokensProvided, wastedCost: cost });
        }
      }
    }

    return Array.from(wasteMap.entries())
      .map(([source, stats]) => ({
        source,
        wastedTokens: stats.wastedTokens,
        wastedCost: stats.wastedCost,
        reason: 'Content not referenced in LLM response',
      }))
      .sort((a, b) => b.wastedTokens - a.wastedTokens)
      .slice(0, limit);
  }

  getAgentRanking(records: LLMCallRecord[]): AgentRanking[] {
    const agentMap = new Map<string, { totalTokens: number; totalCost: number; latencies: number[]; provided: number; referenced: number }>();

    for (const record of records) {
      const existing = agentMap.get(record.agentId);
      const agentProvided = record.contextSources.reduce((s, src) => s + src.tokensProvided, 0);
      const agentReferenced = record.contextSources.reduce((s, src) => s + src.tokensReferenced, 0);
      if (existing) {
        existing.totalTokens += record.totalTokens;
        existing.totalCost += record.cost;
        existing.latencies.push(record.latency);
        existing.provided += agentProvided;
        existing.referenced += agentReferenced;
      } else {
        agentMap.set(record.agentId, {
          totalTokens: record.totalTokens,
          totalCost: record.cost,
          latencies: [record.latency],
          provided: agentProvided,
          referenced: agentReferenced,
        });
      }
    }

    return Array.from(agentMap.entries())
      .map(([agentId, stats]) => ({
        agentId,
        totalTokens: stats.totalTokens,
        totalCost: stats.totalCost,
        efficiency: stats.provided > 0 ? Math.min(stats.referenced / stats.provided, 1) : 0,
        avgLatency: stats.latencies.length > 0
          ? stats.latencies.reduce((s, l) => s + l, 0) / stats.latencies.length
          : 0,
      }))
      .sort((a, b) => b.efficiency - a.efficiency);
  }

  getProviderComparison(records: LLMCallRecord[]): ProviderComparison[] {
    const providerMap = new Map<string, { totalTokens: number; totalCost: number; latencies: number[] }>();

    for (const record of records) {
      const existing = providerMap.get(record.provider);
      if (existing) {
        existing.totalTokens += record.totalTokens;
        existing.totalCost += record.cost;
        existing.latencies.push(record.latency);
      } else {
        providerMap.set(record.provider, {
          totalTokens: record.totalTokens,
          totalCost: record.cost,
          latencies: [record.latency],
        });
      }
    }

    return Array.from(providerMap.entries())
      .map(([provider, stats]) => ({
        provider: provider as Provider,
        totalTokens: stats.totalTokens,
        totalCost: stats.totalCost,
        avgLatency: stats.latencies.length > 0
          ? stats.latencies.reduce((s, l) => s + l, 0) / stats.latencies.length
          : 0,
        avgTokensPerCall: stats.latencies.length > 0
          ? stats.totalTokens / stats.latencies.length
          : 0,
      }))
      .sort((a, b) => b.totalCost - a.totalCost);
  }

  generateAlerts(records: LLMCallRecord[], thresholds?: Partial<{
    budgetExceeded: number;
    wasteThreshold: number;
    efficiencyDrop: number;
    costSpike: number;
  }>): Alert[] {
    const cfg = {
      budgetExceeded: 100000,
      wasteThreshold: 30,
      efficiencyDrop: 0.3,
      costSpike: 10,
      ...thresholds,
    };

    const alerts: Alert[] = [];
    const now = Date.now();

    const totalTokens = records.reduce((sum, r) => sum + r.totalTokens, 0);
    if (totalTokens > cfg.budgetExceeded) {
      alerts.push(this.makeAlert('budget_exceeded', 'critical',
        `Token budget exceeded: ${totalTokens.toLocaleString()} tokens`, totalTokens, cfg.budgetExceeded, now));
    }

    const totalWaste = records.reduce((sum, r) =>
      sum + r.contextSources
        .filter(src => !src.wasReferenced)
        .reduce((s2, src) => s2 + src.tokensProvided, 0), 0);
    const wastePercent = totalTokens > 0 ? (totalWaste / totalTokens) * 100 : 0;
    if (wastePercent > cfg.wasteThreshold) {
      alerts.push(this.makeAlert('waste_threshold', 'warning',
        `Waste ${wastePercent.toFixed(1)}% exceeds threshold ${cfg.wasteThreshold}%`, wastePercent, cfg.wasteThreshold, now));
    }

    const totalProvided = records.reduce((sum, r) =>
      sum + r.contextSources.reduce((s2, src) => s2 + src.tokensProvided, 0), 0);
    const totalReferenced = records.reduce((sum, r) =>
      sum + r.contextSources.reduce((s2, src) => s2 + src.tokensReferenced, 0), 0);
    const efficiency = totalProvided > 0 ? totalReferenced / totalProvided : 1;
    if (efficiency < cfg.efficiencyDrop) {
      alerts.push(this.makeAlert('efficiency_drop', 'warning',
        `Efficiency ${(efficiency * 100).toFixed(1)}% below threshold ${(cfg.efficiencyDrop * 100).toFixed(0)}%`,
        efficiency, cfg.efficiencyDrop, now));
    }

    const totalCost = records.reduce((sum, r) => sum + r.cost, 0);
    if (totalCost > cfg.costSpike) {
      alerts.push(this.makeAlert('cost_spike', 'info',
        `Total cost $${totalCost.toFixed(4)} exceeds threshold $${cfg.costSpike.toFixed(2)}`,
        totalCost, cfg.costSpike, now));
    }

    return alerts;
  }

  private filterByPeriod(records: LLMCallRecord[], period: Period): LLMCallRecord[] {
    const periodMs = this.getPeriodMs(period);
    const cutoff = Date.now() - periodMs;
    return records.filter(r => r.timestamp >= cutoff);
  }

  private getPeriodMs(period: Period): number {
    switch (period) {
      case 'daily': return 86400000;
      case 'weekly': return 604800000;
      case 'monthly': return 2592000000;
    }
  }

  private getPerTokenCost(provider: string): number {
    const costPer1K: Record<string, number> = {
      ollama: 0,
      openai: 0.03,
      deepseek: 0.0004,
    };
    const rate = costPer1K[provider];
    if (rate === undefined) return 0;
    return rate / 1000;
  }

  private makeAlert(
    type: AlertType,
    severity: AlertSeverity,
    message: string,
    metric: number,
    threshold: number,
    timestamp: number,
  ): Alert {
    return { type, severity, message, timestamp, metric, threshold, actual: metric };
  }
}
