import { BayesianRiskEngine } from '../bayesian-engine'

describe('BayesianRiskEngine', () => {
  let engine: BayesianRiskEngine
  beforeEach(() => { engine = new BayesianRiskEngine() })

  it('should infer posterior probability', () => {
    const result = engine.infer('R4', { R3: true })
    expect(result.nodeId).toBe('R4')
    expect(result.posterior).toBeGreaterThan(result.prior)
  })

  it('should decrease probability with negative evidence', () => {
    const withoutEvidence = engine.infer('R4', {})
    const withMitigation = engine.infer('R4', { R3: false })
    expect(withMitigation.posterior).toBeLessThanOrEqual(withoutEvidence.posterior)
  })

  it('should generate risk report', () => {
    engine.infer('R4', { R3: true, R1: true })
    const report = engine.generateReport()
    expect(report.overallRisk).toBeGreaterThan(0)
    expect(report.topRisks.length).toBeGreaterThan(0)
  })
})
