import { HeuristicRegistry } from '../heuristic-registry'
import { HyperHeuristicSelector } from '../hyper-heuristic-selector'

describe('HyperHeuristicSelector', () => {
  let selector: HyperHeuristicSelector

  beforeEach(() => { selector = new HyperHeuristicSelector(new HeuristicRegistry()) })

  it('selects a heuristic for a given task', () => {
    const selected = selector.select('scheduling', 3, 5000)
    expect(selected).toBeDefined()
    expect(typeof selected).toBe('string')
  })

  it('records outcomes', () => {
    selector.recordOutcome('A*', true, 100)
    selector.recordOutcome('Genetic Algorithm', false, 500)
    const report = selector.getPerformanceReport()
    expect(report.length).toBeGreaterThanOrEqual(2)
  })

  it('returns performance report with rates', () => {
    selector.recordOutcome('A*', true, 50)
    selector.recordOutcome('A*', true, 60)
    const report = selector.getPerformanceReport()
    const aStar = report.find(r => r.heuristicName === 'A*')
    expect(aStar?.successRate).toBe(1)
  })
})
