import { createLogger } from '@ideia/logger'
import { BudgetRequest, BudgetAllocation, BudgetState, RenegotiationResult, StrategyType } from './types'

const logger = createLogger('budget-negotiation')

export class BudgetNegotiator {
  private totalBudget: number
  private allocations = new Map<string, number>()
  private strategy: StrategyType

  constructor(totalBudget: number, strategy?: StrategyType) {
    this.totalBudget = totalBudget
    this.strategy = strategy ?? 'priority-weighted'
  }

  allocate(requests: BudgetRequest[]): BudgetAllocation[] {
    const results: BudgetAllocation[] = []

    switch (this.strategy) {
      case 'equal':
        results.push(...this.equalDistribution(requests))
        break
      case 'priority-weighted':
        results.push(...this.priorityWeighted(requests))
        break
      case 'fair-share':
        results.push(...this.fairShare(requests))
        break
      case 'demand-driven':
        results.push(...this.demandDriven(requests))
        break
    }

    for (const r of results) {
      this.allocations.set(r.agentId, r.allocatedTokens)
    }

    logger.info(`Budget allocated`, { strategy: this.strategy, agents: results.length })
    return results
  }

  getState(): BudgetState {
    const used = [...this.allocations.values()].reduce((s, v) => s + v, 0)
    return {
      totalBudget: this.totalBudget,
      used,
      available: this.totalBudget - used,
      allocations: new Map(this.allocations),
      timestamp: new Date().toISOString(),
    }
  }

  renegotiate(requests: BudgetRequest[]): RenegotiationResult {
    const previous = new Map(this.allocations)
    this.allocations.clear()
    this.allocate(requests)
    const changes: RenegotiationResult['changes'] = []
    for (const [agentId, after] of this.allocations) {
      const before = previous.get(agentId) ?? 0
      if (before !== after) changes.push({ agentId, before, after, reason: 'Renegotiated' })
    }
    logger.info(`Budget renegotiated`, { changes: changes.length })
    return { previous, current: new Map(this.allocations), changes }
  }

  private equalDistribution(requests: BudgetRequest[]): BudgetAllocation[] {
    const perAgent = Math.floor(this.totalBudget / requests.length)
    return requests.map(r => ({ agentId: r.agentId, allocatedTokens: Math.min(perAgent, r.requestedTokens), strategy: 'equal' as StrategyType, reason: 'Equal distribution' }))
  }

  private priorityWeighted(requests: BudgetRequest[]): BudgetAllocation[] {
    const totalWeight = requests.reduce((s, r) => s + r.priority, 0)
    const available = this.totalBudget - [...this.allocations.values()].reduce((s, v) => s + v, 0)
    return requests.map(r => {
      const share = totalWeight > 0 ? Math.floor((r.priority / totalWeight) * available) : 0
      const allocated = Math.min(share, r.requestedTokens, Math.max(0, this.totalBudget - [...this.allocations.values()].reduce((s, v) => s + v, 0)))
      return { agentId: r.agentId, allocatedTokens: allocated, strategy: 'priority-weighted' as StrategyType, reason: `Priority weight ${r.priority}/${totalWeight}` }
    })
  }

  private fairShare(requests: BudgetRequest[]): BudgetAllocation[] {
    const cap = Math.floor(this.totalBudget / Math.max(requests.length, 1))
    return requests.map(r => ({
      agentId: r.agentId,
      allocatedTokens: Math.min(cap, r.requestedTokens, this.totalBudget - [...this.allocations.values()].reduce((s, v) => s + v, 0)),
      strategy: 'fair-share' as StrategyType,
      reason: `Fair share cap ${cap}`,
    }))
  }

  private demandDriven(requests: BudgetRequest[]): BudgetAllocation[] {
    const sorted = [...requests].sort((a, b) => b.requestedTokens - a.requestedTokens)
    const available = this.totalBudget - [...this.allocations.values()].reduce((s, v) => s + v, 0)
    return sorted.map(r => {
      const allocated = Math.min(r.requestedTokens, Math.floor(available * 0.5))
      return { agentId: r.agentId, allocatedTokens: allocated, strategy: 'demand-driven' as StrategyType, reason: 'Demand-driven allocation' }
    })
  }
}
