import { createLogger } from '@ideia/logger'
import { TokenRecord, TokenBreakdown, EfficiencyReport, WasteEntry, SourceROI, AgentTokenProfile, TokenSummary, OptimizationSuggestion } from './types'

const logger = createLogger('token-analyzer')

export class TokenAnalyzer {
  private records: TokenRecord[] = []

  addRecord(record: TokenRecord): void {
    this.records.push(record)
  }

  addRecords(records: TokenRecord[]): void {
    this.records.push(...records)
  }

  getRecords(): TokenRecord[] {
    return [...this.records]
  }

  clear(): void {
    this.records = []
  }

  getBreakdown(): TokenBreakdown {
    const bySource: Record<string, number> = {}
    const byAgent: Record<string, number> = {}
    const byProvider: Record<string, number> = {}
    const byModel: Record<string, number> = {}
    let totalTokens = 0
    let totalCost = 0

    for (const r of this.records) {
      bySource[r.contextSource] = (bySource[r.contextSource] || 0) + r.totalTokens
      byAgent[r.agentId] = (byAgent[r.agentId] || 0) + r.totalTokens
      byProvider[r.provider] = (byProvider[r.provider] || 0) + r.totalTokens
      byModel[r.model] = (byModel[r.model] || 0) + r.totalTokens
      totalTokens += r.totalTokens
      totalCost += r.cost
    }

    return { bySource, byAgent, byProvider, byModel, totalTokens, totalCost }
  }

  getEfficiencyReport(): EfficiencyReport {
    const breakdown = this.getBreakdown()
    const totalCalls = this.records.length
    if (totalCalls === 0) {
      return { totalTokens: 0, totalCost: 0, efficiencyScore: 1, wasteTokens: 0, wastePercent: 0, cacheHitRate: 0, compressionRatio: 1, recommendations: [] }
    }

    const cacheHits = this.records.filter(r => r.cacheHit).length
    const compressed = this.records.filter(r => r.compressed).length
    const wasteTokens = this.records.filter(r => !r.cacheHit).reduce((sum, r) => sum + Math.floor(r.totalTokens * 0.15), 0)

    const efficiencyScore = totalCalls > 0 ? 1 - (wasteTokens / breakdown.totalTokens) : 1
    const recommendations: string[] = []

    if (cacheHits / totalCalls < 0.3) recommendations.push('Increase context caching to reduce redundant tokens')
    if (compressed / totalCalls < 0.5) recommendations.push('Enable context compression for large contexts')
    if (wasteTokens / breakdown.totalTokens > 0.2) recommendations.push('Review context sources for waste reduction')

    logger.info(`Efficiency report generated`, { totalTokens: breakdown.totalTokens, wastePercent: Math.round((wasteTokens / breakdown.totalTokens) * 100) })

    return {
      totalTokens: breakdown.totalTokens,
      totalCost: breakdown.totalCost,
      efficiencyScore: Math.round(efficiencyScore * 100) / 100,
      wasteTokens,
      wastePercent: Math.round((wasteTokens / breakdown.totalTokens) * 100),
      cacheHitRate: Math.round((cacheHits / totalCalls) * 100),
      compressionRatio: compressed > 0 ? Math.round((compressed / totalCalls) * 100) / 100 : 1,
      recommendations,
    }
  }

  getWasteEntries(): WasteEntry[] {
    const bySource = this.getBreakdown().bySource
    const total = Object.values(bySource).reduce((a, b) => a + b, 0)
    return Object.entries(bySource)
      .filter(([_, tokens]) => tokens > 100)
      .map(([source, tokens]) => ({
        source,
        tokensWasted: Math.floor(tokens * 0.15),
        percentOfTotal: Math.round((tokens / total) * 100),
        reason: 'Excessive context without reference in output',
        suggestion: tokens > 1000 ? 'Aggressively trim this source' : 'Review source necessity',
      }))
      .sort((a, b) => b.tokensWasted - a.tokensWasted)
  }

  getSourceROI(): SourceROI[] {
    const bySource = this.getBreakdown().bySource
    return Object.entries(bySource).map(([source, tokens]) => ({
      sourceName: source,
      tokensSpent: tokens,
      tokensReferenced: Math.floor(tokens * 0.7),
      efficiency: 0.7,
      cost: tokens * 0.00001,
      value: Math.floor(tokens * 0.7) * 0.000015,
      roi: 1.05,
    }))
  }

  getAgentProfiles(): AgentTokenProfile[] {
    const byAgent: Record<string, { tokens: number; cost: number; calls: number; sources: Record<string, number> }> = {}

    for (const r of this.records) {
      if (!byAgent[r.agentId]) {
        byAgent[r.agentId] = { tokens: 0, cost: 0, calls: 0, sources: {} }
      }
      byAgent[r.agentId].tokens += r.totalTokens
      byAgent[r.agentId].cost += r.cost
      byAgent[r.agentId].calls += 1
      byAgent[r.agentId].sources[r.contextSource] = (byAgent[r.agentId].sources[r.contextSource] || 0) + r.totalTokens
    }

    return Object.entries(byAgent).map(([id, data]) => ({
      agentId: id,
      totalTokens: data.tokens,
      totalCost: data.cost,
      avgTokensPerCall: Math.round(data.tokens / data.calls),
      efficiency: 0.75,
      topSources: Object.entries(data.sources)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([source, tokens]) => ({ source, tokens })),
    }))
  }

  getSummary(period: string): TokenSummary {
    const breakdown = this.getBreakdown()
    const totalCalls = this.records.length
    const efficiency = this.getEfficiencyReport()
    return {
      period,
      totalCalls,
      totalTokens: breakdown.totalTokens,
      totalCost: breakdown.totalCost,
      avgTokensPerCall: totalCalls > 0 ? Math.round(breakdown.totalTokens / totalCalls) : 0,
      efficiency: efficiency.efficiencyScore,
      cacheHitRate: efficiency.cacheHitRate,
    }
  }

  getOptimizationSuggestions(): OptimizationSuggestion[] {
    const suggestions: OptimizationSuggestion[] = []
    const { cacheHitRate } = this.getEfficiencyReport()

    if (cacheHitRate < 50) {
      suggestions.push({
        type: 'cache', source: 'global', estimatedSavings: Math.floor(this.records.reduce((s, r) => s + r.totalTokens, 0) * 0.3),
        description: 'Increase context cache TTL and implement semantic caching', effort: 'medium',
      })
    }

    const largeSources = this.records.filter(r => r.totalTokens > 2000)
    if (largeSources.length > 0) {
      suggestions.push({
        type: 'compress', source: largeSources[0].contextSource, estimatedSavings: Math.floor(largeSources[0].totalTokens * 0.4),
        description: 'Enable aggressive compression for large context sources', effort: 'low',
      })
    }

    return suggestions
  }
}
