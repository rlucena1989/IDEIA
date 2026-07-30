import { CostBenefitAnalyzer } from '../analyzer'

describe('CostBenefitAnalyzer', () => {
  let analyzer: CostBenefitAnalyzer
  beforeEach(() => { analyzer = new CostBenefitAnalyzer() })

  it('should analyze cost-benefit for complex tasks', () => {
    const result = analyzer.analyze({ taskDescription: 'Build auth system', complexity: 0.8, estimatedTokens: 2000, contextSize: 5000, historyAvailable: true })
    expect(result.recommendedDepth).toBe('detailed')
    expect(typeof result.roi).toBe('number')
  })

  it('should estimate costs', () => {
    const cost = analyzer.estimateCost({ taskDescription: 'Fix bug', complexity: 0.3, estimatedTokens: 500, contextSize: 1000, historyAvailable: false })
    expect(cost.planTokens).toBeGreaterThan(0)
    expect(cost.execWithPlan).toBeGreaterThan(0)
  })

  it('should record history', () => {
    analyzer.recordResult({ taskId: 'T1', complexity: 0.5, planned: true, durationMs: 1000, retries: 0, success: true })
    const result = analyzer.analyze({ taskDescription: 'T2', complexity: 0.5, estimatedTokens: 1000, contextSize: 2000, historyAvailable: true })
    expect(result.confidence).toBe(0.85)
  })
})
