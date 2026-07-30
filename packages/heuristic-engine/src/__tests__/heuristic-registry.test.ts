import { HeuristicRegistry } from '../heuristic-registry'

describe('HeuristicRegistry', () => {
  let registry: HeuristicRegistry

  beforeEach(() => { registry = new HeuristicRegistry() })

  it('lists all available heuristics', () => {
    const heuristics = registry.listHeuristics()
    expect(heuristics.length).toBeGreaterThanOrEqual(5)
  })

  it('creates A* solver', () => {
    const solver = registry.createAStar()
    expect(solver).toBeDefined()
  })

  it('creates constraint satisfaction', () => {
    const cs = registry.createConstraintSatisfaction()
    expect(cs).toBeDefined()
  })

  it('creates optimization engine', () => {
    const engine = registry.createOptimizationEngine()
    expect(engine).toBeDefined()
  })

  it('registers and retrieves solver', () => {
    registry.register('custom', 'hybrid', {})
    expect(registry.getSolver('custom')).toBeDefined()
  })
})
