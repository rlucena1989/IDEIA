import { UnifiedIntelligenceNucleus } from '../nucleus'

describe('UnifiedIntelligenceNucleus', () => {
  let nucleus: UnifiedIntelligenceNucleus
  beforeEach(() => { nucleus = new UnifiedIntelligenceNucleus() })

  it('should reason symbolically', () => {
    nucleus.addFact({ subject: 'IDEIA', predicate: 'is', object: 'a platform', confidence: 1 })
    const result = nucleus.reason({ query: 'IDEIA', context: {}, mode: 'symbolic' })
    expect(result.answer).toContain('IDEIA')
    expect(result.confidence).toBe(1)
    expect(result.steps.length).toBeGreaterThan(0)
  })

  it('should reason connectionist', () => {
    const result = nucleus.reason({ query: 'classify text', context: {}, mode: 'connectionist' })
    expect(result.answer).toContain('Neural')
    expect(result.confidence).toBe(0.85)
  })

  it('should reason probabilistic', () => {
    const result = nucleus.reason({ query: 'P(error)', context: {}, mode: 'probabilistic' })
    expect(result.answer).toContain('Bayesian')
    expect(result.confidence).toBe(0.78)
  })

  it('should reason hybrid', () => {
    const result = nucleus.reason({ query: 'solve', context: {}, mode: 'hybrid' })
    expect(result.mode).toBe('hybrid')
    expect(result.durationMs).toBeGreaterThanOrEqual(0)
  })

  it('should provide available models', () => {
    const models = nucleus.getModels()
    expect(models.length).toBe(3)
    expect(models.some(m => m.name === 'SymbolicReasoner')).toBe(true)
  })
})
