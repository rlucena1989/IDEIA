import { BudgetNegotiator } from '../budget-negotiation'

describe('BudgetNegotiator', () => {
  it('should allocate with priority-weighted strategy', () => {
    const negotiator = new BudgetNegotiator(1000, 'priority-weighted')
    const results = negotiator.allocate([
      { agentId: 'a1', priority: 3, requestedTokens: 500, currentUsage: 100, taskType: 'core' },
      { agentId: 'a2', priority: 1, requestedTokens: 300, currentUsage: 50, taskType: 'core' },
    ])
    expect(results.length).toBe(2)
    expect(results[0].agentId).toBe('a1')
    expect(results[0].allocatedTokens).toBeGreaterThan(0)
    expect(results[1].allocatedTokens).toBeGreaterThan(0)
  })

  it('should allocate with equal distribution', () => {
    const negotiator = new BudgetNegotiator(1000, 'equal')
    const results = negotiator.allocate([
      { agentId: 'a1', priority: 1, requestedTokens: 1000, currentUsage: 0, taskType: 'x' },
      { agentId: 'a2', priority: 1, requestedTokens: 1000, currentUsage: 0, taskType: 'x' },
    ])
    expect(results[0].allocatedTokens).toBe(500)
    expect(results[1].allocatedTokens).toBe(500)
  })

  it('should track budget state', () => {
    const negotiator = new BudgetNegotiator(2000)
    negotiator.allocate([{ agentId: 'a1', priority: 1, requestedTokens: 800, currentUsage: 0, taskType: 'x' }])
    const state = negotiator.getState()
    expect(state.used).toBeGreaterThan(0)
    expect(state.available).toBeLessThan(2000)
  })

  it('should renegotiate allocations', () => {
    const negotiator = new BudgetNegotiator(1000)
    negotiator.allocate([{ agentId: 'a1', priority: 1, requestedTokens: 500, currentUsage: 0, taskType: 'x' }])
    const result = negotiator.renegotiate([
      { agentId: 'a1', priority: 3, requestedTokens: 800, currentUsage: 500, taskType: 'x' },
      { agentId: 'a2', priority: 2, requestedTokens: 300, currentUsage: 0, taskType: 'x' },
    ])
    expect(result.changes.length).toBeGreaterThan(0)
  })

  it('should handle fair-share strategy', () => {
    const negotiator = new BudgetNegotiator(1000, 'fair-share')
    const results = negotiator.allocate([
      { agentId: 'a1', priority: 1, requestedTokens: 1000, currentUsage: 0, taskType: 'x' },
      { agentId: 'a2', priority: 1, requestedTokens: 500, currentUsage: 0, taskType: 'x' },
    ])
    expect(results[0].allocatedTokens).toBe(500)
    expect(results[1].allocatedTokens).toBe(500)
  })
})
