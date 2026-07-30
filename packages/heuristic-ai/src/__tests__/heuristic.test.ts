import { HeuristicEngine } from '../heuristic-engine'

describe('HeuristicEngine', () => {
  let engine: HeuristicEngine
  beforeEach(() => { engine = new HeuristicEngine() })

  it('should evaluate decision context', () => {
    const result = engine.evaluate({ input: { complexity: 0.9, security: 0.8, pattern: 0.7 }, rules: [], weights: {} })
    expect(result.topRules.length).toBe(3)
    expect(result.score).toBeGreaterThan(0)
  })

  it('should have default rules', () => {
    expect(engine.getRules().length).toBe(5)
  })

  it('should add new rules', () => {
    engine.addRule({ id: 'H6', name: 'Custom', condition: 'custom', weight: 0.5, category: 'custom', enabled: true })
    expect(engine.getRules().length).toBe(6)
  })

  it('should toggle rule enablement', () => {
    engine.enableRule('H1', false)
    const result = engine.evaluate({ input: { complexity: 1 }, rules: [], weights: {} })
    expect(result.topRules.every(r => r.ruleId !== 'H1')).toBe(true)
  })

  it('should optimize rule weights', () => {
    const opt = engine.optimize('H1', 0.85)
    expect(opt.ruleId).toBe('H1')
    expect(opt.afterWeight).toBeGreaterThan(opt.beforeWeight)
  })
})
