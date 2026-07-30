import { LLMCallRecord, ContextSource, SourceAnalysis, WasteReport, WasteSource, SourceBreakdown } from './types-analytics';
import { createLogger } from '@ideia/logger';
const logger = createLogger('token-analyzer');

const CHAR_PER_TOKEN: Record<string, number> = {
  text: 4,
  code: 3,
  json: 2.5,
};

export class TokenAnalyzer {
  count(text: string, type: 'text' | 'code' | 'json' = 'text'): number {
    const ratio = CHAR_PER_TOKEN[type];
    return Math.ceil(text.length / ratio);
  }

  countPrecise(text: string, model: string = 'gpt-4'): number {
    try {
      const encoding = this.getEncoding(model);
      return encoding.encode(text).length;
    } catch {
      return this.count(text);
    }
  }

  analyzeSource(callRecords: LLMCallRecord[], sourceName: string): SourceAnalysis {
    let totalTokens = 0;
    let totalCost = 0;
    let timesReferenced = 0;
    let wastedTokens = 0;
    let wastedCost = 0;

    for (const record of callRecords) {
      for (const source of record.contextSources) {
        if (source.source !== sourceName) {
          continue;
        }
        totalTokens += source.tokensProvided;
        totalCost += source.tokensProvided * this.getPerTokenCost(record.provider);
        timesReferenced += source.wasReferenced ? 1 : 0;
        if (!source.wasReferenced) {
          wastedTokens += source.tokensProvided;
          wastedCost += source.tokensProvided * this.getPerTokenCost(record.provider);
        }
      }
    }

    const efficiency = totalTokens > 0
      ? callRecords.reduce((sum, r) => sum + r.contextSources
          .filter(s => s.source === sourceName)
          .reduce((s2, s) => s2 + s.tokensReferenced, 0), 0) / totalTokens
      : 0;

    return {
      source: sourceName,
      totalTokens,
      totalCost,
      timesReferenced,
      efficiency: Math.min(efficiency, 1.0),
      wasteTokens: wastedTokens,
      wastePercent: totalTokens > 0 ? (wastedTokens / totalTokens) * 100 : 0,
    };
  }

  calculateEfficiency(referenced: number, provided: number): number {
    if (provided <= 0) return 0;
    return Math.min(referenced / provided, 1.0);
  }

  detectWaste(callRecords: LLMCallRecord[]): WasteReport {
    const wasteSources = new Map<string, { wastedTokens: number; wastedCost: number }>();
    let totalWasteTokens = 0;
    let totalWasteCost = 0;

    for (const record of callRecords) {
      for (const source of record.contextSources) {
        if (source.wasReferenced) {
          continue;
        }
        const cost = source.tokensProvided * this.getPerTokenCost(record.provider);
        const existing = wasteSources.get(source.source);
        if (existing) {
          existing.wastedTokens += source.tokensProvided;
          existing.wastedCost += cost;
        } else {
          wasteSources.set(source.source, { wastedTokens: source.tokensProvided, wastedCost: cost });
        }
        totalWasteTokens += source.tokensProvided;
        totalWasteCost += cost;
      }
    }

    const topWasteSources: WasteSource[] = Array.from(wasteSources.entries())
      .map(([source, stats]) => ({
        source,
        wastedTokens: stats.wastedTokens,
        wastedCost: stats.wastedCost,
        reason: 'Content not referenced in LLM response',
      }))
      .sort((a, b) => b.wastedTokens - a.wastedTokens)
      .slice(0, 20);

    const recommendations: string[] = [];
    if (totalWasteTokens > 10000) {
      recommendations.push(`Total waste ${totalWasteTokens.toLocaleString()} tokens - implement context pruning`);
    }
    if (topWasteSources.length > 0) {
      const topSource = topWasteSources[0];
      recommendations.push(`Reduce ${topSource.source} context: ${topSource.wastedTokens} tokens wasted (${(topSource.wastedCost).toFixed(4)} USD)`);
    }
    if (recommendations.length === 0) {
      recommendations.push('Waste levels are within acceptable range');
    }

    return { totalWasteTokens, totalWasteCost, topWasteSources, recommendations };
  }

  categorizeBySource(callRecords: LLMCallRecord[]): SourceBreakdown {
    const sourceData = new Map<string, { tokens: number; cost: number }>();
    let totalTokens = 0;
    let totalCost = 0;

    for (const record of callRecords) {
      for (const source of record.contextSources) {
        const cost = source.tokensProvided * this.getPerTokenCost(record.provider);
        const existing = sourceData.get(source.source);
        if (existing) {
          existing.tokens += source.tokensProvided;
          existing.cost += cost;
        } else {
          sourceData.set(source.source, { tokens: source.tokensProvided, cost });
        }
        totalTokens += source.tokensProvided;
        totalCost += cost;
      }
    }

    const sources: Record<string, { tokens: number; cost: number; percentage: number }> = {};
    for (const [source, data] of sourceData.entries()) {
      sources[source] = {
        tokens: data.tokens,
        cost: data.cost,
        percentage: totalTokens > 0 ? (data.tokens / totalTokens) * 100 : 0,
      };
    }

    return { sources };
  }

  private getEncoding(model: string): { encode: (t: string) => string[] } {
    try {
      const mod = require('tiktoken');
      return mod.get_encoding(model) || mod.encoding_for_model(model);
    } catch {
      return { encode: (t: string) => t.split(' ') };
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
}
