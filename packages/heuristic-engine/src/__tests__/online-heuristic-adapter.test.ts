import { HeuristicRegistry } from '../heuristic-registry'
import { NeuralGuidedSearch } from '../neural-guided-search'
import { HyperHeuristicSelector } from '../hyper-heuristic-selector'
import { OnlineHeuristicAdapter } from '../online-heuristic-adapter'

describe('OnlineHeuristicAdapter', () => {
  let adapter: OnlineHeuristicAdapter

  beforeEach(() => {
    adapter = new OnlineHeuristicAdapter(new NeuralGuidedSearch(), new HyperHeuristicSelector(new HeuristicRegistry()), { adaptationRate: 0.1, windowSize: 100, minSamplesBeforeAdapt: 2 })
  })

  it('records execution', () => {
    adapter.recordExecution('scheduling', 'A*', 100, true)
    const summary = adapter.getAdaptationSummary()
    expect(summary.totalExecutions).toBe(1)
  })

  it('adapts based on history', () => {
    adapter.recordExecution('scheduling', 'A*', 100, true)
    adapter.recordExecution('scheduling', 'A*', 50, true)
    const selected = adapter.adapt('scheduling', 5, 5000)
    expect(selected).toBeDefined()
  })

  it('returns best performer', () => {
    adapter.recordExecution('a', 'A*', 100, true)
    adapter.recordExecution('a', 'Greedy', 200, false)
    const summary = adapter.getAdaptationSummary()
    expect(summary.bestPerformer).toBe('A*')
  })

  it('uses hyper selector when not enough data', () => {
    const selected = adapter.adapt('optimization', 10, 5000)
    expect(selected).toBeDefined()
  })
})
