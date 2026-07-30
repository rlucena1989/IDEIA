import { createLogger } from '@ideia/logger';
import {
  LLMCallRecord,
  Recommendation,
  RecommendationType,
  RecommendationPriority,
  CompressionSuggestion,
  CacheSuggestion,
  ProviderSuggestion,
  RefinementSuggestion,
  Provider,
  TaskType,
  RefinementTechnique,
} from './types-analytics';
const logger = createLogger('optimization-recommender');

export class OptimizationRecommender {
  analyze(records: LLMCallRecord[]): Recommendation[] {
    const recommendations: Recommendation[] = [];

    const byProvider = this.groupByProvider(records);
    const bySource = this.groupBySource(records);

    for (const [provider, recs] of Object.entries(byProvider)) {
      const totalCost = recs.reduce((sum, r) => sum + r.cost, 0);
      const cacheHitRate = recs.filter(r => r.cacheHit).length / Math.max(recs.length, 1);

      if (cacheHitRate < 0.3) {
        recommendations.push({
          type: 'cache',
          priority: 'medium',
          description: `Improve cache strategy for ${provider}: hit rate ${(cacheHitRate * 100).toFixed(0)}%`,
          expectedSavings: totalCost * 0.3,
          source: provider,
          implementation: 'Implement semantic cache with embedding similarity threshold',
        });
      }

      const avgLatency = recs.reduce((sum, r) => sum + r.latency, 0) / Math.max(recs.length, 1);
      if (avgLatency > 5000) {
        recommendations.push({
          type: 'switch_provider',
          priority: 'medium',
          description: `${provider} latency is ${(avgLatency / 1000).toFixed(1)}s - consider alternative`,
          expectedSavings: totalCost * 0.1,
          source: provider,
          implementation: 'Route latency-sensitive tasks to faster provider',
        });
      }
    }

    for (const [source, stats] of Object.entries(bySource)) {
      if (stats.efficiency < 0.2 && stats.tokensProvided > 1000) {
        const savings = stats.tokensProvided * (1 - stats.efficiency) * 0.00003;
        recommendations.push({
          type: 'compress',
          priority: 'high',
          description: `Reduce ${source} context: ${(stats.efficiency * 100).toFixed(0)}% efficiency`,
          expectedSavings: savings,
          source,
          implementation: `Apply aggressive compression to ${source} (target: 40% reduction)`,
        });
      }

      if (stats.count > 10 && stats.tokensProvided > 5000) {
        const savings = stats.tokensProvided * 0.7 * 0.00003;
        recommendations.push({
          type: 'cache',
          priority: 'low',
          description: `Cache ${source} context - ${stats.count} calls, ${stats.tokensProvided} total tokens`,
          expectedSavings: savings,
          source,
          implementation: `Add TTL-based cache for ${source} with 5-minute expiration`,
        });
      }
    }

    const uncompressed = records.filter(r => !r.compressed);
    if (uncompressed.length > 0) {
      const totalTokens = uncompressed.reduce((sum, r) => sum + r.totalTokens, 0);
      recommendations.push({
        type: 'compress',
        priority: 'high',
        description: `Enable compression for ${uncompressed.length} uncompressed calls`,
        expectedSavings: totalTokens * 0.4 * 0.00003,
        source: 'all',
        implementation: 'Integrate ContextCompressor with cascade strategy (target ratio: 0.6)',
      });
    }

    for (const record of records) {
      const contextRatio = record.promptTokens / Math.max(record.completionTokens, 1);
      if (contextRatio > 15 && record.promptTokens > 2000) {
        recommendations.push({
          type: 'refine_prompt',
          priority: 'medium',
          description: `Call with ${contextRatio.toFixed(0)}:1 context-to-completion ratio (${record.promptTokens} prompt tokens)`,
          expectedSavings: record.promptTokens * 0.5 * 0.00003,
          source: record.agentId,
          implementation: 'Review context construction - prune unnecessary sources',
        });
      }
    }

    if (records.length > 0) {
      const totalWaste = records.reduce((sum, r) =>
        sum + r.contextSources
          .filter(src => !src.wasReferenced)
          .reduce((s2, src) => s2 + src.tokensProvided, 0), 0);
      if (totalWaste > 10000) {
        recommendations.push({
          type: 'refine_prompt',
          priority: 'high',
          description: `Total waste ${totalWaste.toLocaleString()} tokens - implement context pruning`,
          expectedSavings: totalWaste * 0.00003,
          source: 'all',
          implementation: 'Add wasReferenced awareness to context composer',
        });
      }
    }

    if (recommendations.length === 0) {
      recommendations.push({
        type: 'compress',
        priority: 'low',
        description: 'Token usage is within normal parameters',
        expectedSavings: 0,
        source: 'all',
        implementation: 'Continue monitoring',
      });
    }

    return recommendations.sort((a, b) => b.expectedSavings - a.expectedSavings);
  }

  suggestCompression(source: string, history: LLMCallRecord[]): CompressionSuggestion | null {
    const relevant = history.filter(r =>
      r.contextSources.some(s => s.source === source)
    );
    if (relevant.length === 0) return null;

    const compressed = relevant.filter(r => r.compressed);
    const currentRatio = compressed.length > 0
      ? compressed.reduce((sum, r) => sum + r.compressionRatio, 0) / compressed.length
      : 1;

    const suggestedRatio = Math.max(currentRatio * 0.7, 0.3);
    const totalTokens = relevant.reduce((sum, r) => sum + r.totalTokens, 0);
    const expectedSavings = totalTokens * (currentRatio - suggestedRatio) * 0.00003;

    return { source, currentRatio, suggestedRatio, expectedSavings };
  }

  suggestCacheStrategy(source: string): CacheSuggestion | null {
    return {
      source,
      hitRate: 0,
      suggestedTTL: 300000,
      expectedSavings: 0,
    };
  }

  suggestProviderSwitch(currentProvider: Provider, taskType: TaskType): ProviderSuggestion | null {
    if (currentProvider === 'openai') {
      return {
        currentProvider: 'openai',
        suggestedProvider: 'deepseek',
        taskType,
        expectedCostReduction: 0.98,
        qualityImpact: taskType === 'code' ? 'Minimal - deepseek excels at code' : 'Minor quality difference',
      };
    }
    return null;
  }

  suggestPromptRefinement(source: string): RefinementSuggestion | null {
    return {
      targetTokens: 2000,
      currentTokens: 5000,
      reduction: 0.6,
      technique: 'summarize',
    };
  }

  private groupByProvider(records: LLMCallRecord[]): Record<string, LLMCallRecord[]> {
    const grouped: Record<string, LLMCallRecord[]> = {};
    for (const r of records) {
      const provider = r.provider;
      if (!grouped[provider]) {
        grouped[provider] = [];
      }
      grouped[provider].push(r);
    }
    return grouped;
  }

  private groupBySource(records: LLMCallRecord[]): Record<string, { count: number; tokensProvided: number; efficiency: number }> {
    const grouped = new Map<string, { count: number; provided: number; referenced: number }>();
    for (const record of records) {
      for (const source of record.contextSources) {
        const existing = grouped.get(source.source);
        if (existing) {
          existing.count++;
          existing.provided += source.tokensProvided;
          existing.referenced += source.tokensReferenced;
        } else {
          grouped.set(source.source, { count: 1, provided: source.tokensProvided, referenced: source.tokensReferenced });
        }
      }
    }

    const result: Record<string, { count: number; tokensProvided: number; efficiency: number }> = {};
    for (const [source, stats] of grouped.entries()) {
      result[source] = {
        count: stats.count,
        tokensProvided: stats.provided,
        efficiency: stats.provided > 0 ? stats.referenced / stats.provided : 0,
      };
    }
    return result;
  }
}
