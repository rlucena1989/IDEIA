export interface TokenRecord {
  id: string
  timestamp: string
  agentId: string
  provider: string
  model: string
  inputTokens: number
  outputTokens: number
  totalTokens: number
  contextSource: string
  durationMs: number
  cost: number
  cacheHit: boolean
  compressed: boolean
  originalTokens?: number
}

export interface TokenBreakdown {
  bySource: Record<string, number>
  byAgent: Record<string, number>
  byProvider: Record<string, number>
  byModel: Record<string, number>
  totalTokens: number
  totalCost: number
}

export interface EfficiencyReport {
  totalTokens: number
  totalCost: number
  efficiencyScore: number
  wasteTokens: number
  wastePercent: number
  cacheHitRate: number
  compressionRatio: number
  recommendations: string[]
}

export interface WasteEntry {
  source: string
  tokensWasted: number
  percentOfTotal: number
  reason: string
  suggestion: string
}

export interface SourceROI {
  sourceName: string
  tokensSpent: number
  tokensReferenced: number
  efficiency: number
  cost: number
  value: number
  roi: number
}

export interface AgentTokenProfile {
  agentId: string
  totalTokens: number
  totalCost: number
  avgTokensPerCall: number
  efficiency: number
  topSources: Array<{ source: string; tokens: number }>
}

export interface TokenSummary {
  period: string
  totalCalls: number
  totalTokens: number
  totalCost: number
  avgTokensPerCall: number
  efficiency: number
  cacheHitRate: number
}

export interface OptimizationSuggestion {
  type: 'compress' | 'cache' | 'trim' | 'restructure' | 'redirect'
  source: string
  estimatedSavings: number
  description: string
  effort: 'low' | 'medium' | 'high'
}
