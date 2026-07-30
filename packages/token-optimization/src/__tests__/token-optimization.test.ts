import { TokenAnalyzer } from '../token-analyzer'
import { TokenRecord } from '../types'

function makeRecord(overrides: Partial<TokenRecord>): TokenRecord {
  return {
    id: `rec-${Date.now()}-${Math.random()}`,
    timestamp: new Date().toISOString(),
    agentId: 'agent1',
    provider: 'openai',
    model: 'gpt-4',
    inputTokens: 500,
    outputTokens: 100,
    totalTokens: 600,
    contextSource: 'system-prompt',
    durationMs: 1000,
    cost: 0.03,
    cacheHit: false,
    compressed: false,
    ...overrides,
  }
}

describe('TokenAnalyzer', () => {
  let analyzer: TokenAnalyzer

  beforeEach(() => {
    analyzer = new TokenAnalyzer()
  })

  it('should add and retrieve records', () => {
    analyzer.addRecord(makeRecord({ id: 'rec-1' }))
    analyzer.addRecord(makeRecord({ id: 'rec-2' }))
    expect(analyzer.getRecords().length).toBe(2)
  })

  it('should clear all records', () => {
    analyzer.addRecord(makeRecord({}))
    analyzer.clear()
    expect(analyzer.getRecords().length).toBe(0)
  })

  it('should generate breakdown', () => {
    analyzer.addRecord(makeRecord({ agentId: 'a1', provider: 'openai', totalTokens: 600, cost: 0.03 }))
    analyzer.addRecord(makeRecord({ agentId: 'a2', provider: 'deepseek', totalTokens: 400, cost: 0.02 }))
    const breakdown = analyzer.getBreakdown()
    expect(breakdown.totalTokens).toBe(1000)
    expect(breakdown.totalCost).toBe(0.05)
    expect(breakdown.byAgent['a1']).toBe(600)
    expect(breakdown.byProvider['deepseek']).toBe(400)
  })

  it('should generate efficiency report', () => {
    analyzer.addRecord(makeRecord({ cacheHit: true, totalTokens: 600 }))
    analyzer.addRecord(makeRecord({ cacheHit: false, totalTokens: 400 }))
    const report = analyzer.getEfficiencyReport()
    expect(report.totalTokens).toBe(1000)
    expect(report.cacheHitRate).toBe(50)
    expect(report.efficiencyScore).toBeGreaterThan(0)
    expect(report.recommendations.length).toBeGreaterThan(0)
  })

  it('should return empty report when no records', () => {
    const report = analyzer.getEfficiencyReport()
    expect(report.totalTokens).toBe(0)
    expect(report.efficiencyScore).toBe(1)
  })

  it('should identify waste entries', () => {
    analyzer.addRecord(makeRecord({ contextSource: 'large-context', totalTokens: 5000 }))
    const waste = analyzer.getWasteEntries()
    expect(waste.length).toBeGreaterThan(0)
    expect(waste[0].tokensWasted).toBeGreaterThan(0)
  })

  it('should calculate source ROI', () => {
    analyzer.addRecord(makeRecord({ contextSource: 'codebase', totalTokens: 1000 }))
    analyzer.addRecord(makeRecord({ contextSource: 'docs', totalTokens: 500 }))
    const roi = analyzer.getSourceROI()
    expect(roi.length).toBe(2)
    expect(roi.find(r => r.sourceName === 'codebase')!.tokensSpent).toBe(1000)
  })

  it('should build agent profiles', () => {
    analyzer.addRecord(makeRecord({ agentId: 'programmer', totalTokens: 1000, contextSource: 'code' }))
    analyzer.addRecord(makeRecord({ agentId: 'programmer', totalTokens: 500, contextSource: 'docs' }))
    analyzer.addRecord(makeRecord({ agentId: 'reviewer', totalTokens: 300, contextSource: 'code' }))
    const profiles = analyzer.getAgentProfiles()
    expect(profiles.length).toBe(2)
    const programmerProfile = profiles.find(p => p.agentId === 'programmer')!
    expect(programmerProfile.totalTokens).toBe(1500)
    expect(programmerProfile.topSources.length).toBe(2)
  })

  it('should generate summary', () => {
    analyzer.addRecord(makeRecord({ totalTokens: 600, cost: 0.03 }))
    analyzer.addRecord(makeRecord({ totalTokens: 400, cost: 0.02, cacheHit: true }))
    const summary = analyzer.getSummary('2026-07')
    expect(summary.totalCalls).toBe(2)
    expect(summary.totalTokens).toBe(1000)
    expect(summary.avgTokensPerCall).toBe(500)
  })

  it('should suggest optimizations', () => {
    analyzer.addRecord(makeRecord({ totalTokens: 3000, contextSource: 'large-file' }))
    const suggestions = analyzer.getOptimizationSuggestions()
    expect(suggestions.length).toBeGreaterThan(0)
    expect(suggestions.some(s => s.type === 'compress')).toBe(true)
  })
})
