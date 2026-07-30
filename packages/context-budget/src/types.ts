export interface BudgetRequest {
  agentId: string
  priority: number
  requestedTokens: number
  currentUsage: number
  taskType: string
}

export interface BudgetAllocation {
  agentId: string
  allocatedTokens: number
  strategy: StrategyType
  reason: string
}

export type StrategyType = 'equal' | 'priority-weighted' | 'fair-share' | 'demand-driven'

export interface BudgetState {
  totalBudget: number
  used: number
  available: number
  allocations: Map<string, number>
  timestamp: string
}

export interface RenegotiationResult {
  previous: Map<string, number>
  current: Map<string, number>
  changes: Array<{ agentId: string; before: number; after: number; reason: string }>
}
