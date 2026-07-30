import { NeuralGuidedSearch } from '../neural-guided-search'

describe('NeuralGuidedSearch', () => {
  let search: NeuralGuidedSearch

  beforeEach(() => { search = new NeuralGuidedSearch() })

  it('learns from state-action-reward', () => {
    search.learnPattern({ taskType: 'refactor' }, 'A*', 0.8)
    expect(search.getLearnedPatterns()).toBe(1)
  })

  it('predicts best action', () => {
    search.learnPattern({ taskType: 'refactor' }, 'A*', 0.9)
    search.learnPattern({ taskType: 'refactor' }, 'Greedy', 0.3)
    const scored = search.predict({ taskType: 'refactor' }, ['A*', 'Greedy'])
    expect(scored[0].action).toBe('A*')
  })

  it('selects best action', () => {
    search.learnPattern({ taskType: 'debug' }, 'Simulated Annealing', 0.85)
    const action = search.selectBestAction({ taskType: 'debug' }, ['A*', 'Simulated Annealing'])
    expect(action).toBe('Simulated Annealing')
  })

  it('returns null when no actions provided', () => {
    expect(search.selectBestAction({}, [])).toBeNull()
  })

  it('batch learns from experiences', () => {
    search.batchLearn([
      { state: { taskType: 'a' }, action: 'A*', reward: 1 },
      { state: { taskType: 'b' }, action: 'GA', reward: 0.5 },
    ])
    expect(search.getLearnedPatterns()).toBe(2)
  })

  it('clears learned patterns', () => {
    search.learnPattern({ taskType: 'test' }, 'A*', 0.5)
    search.clear()
    expect(search.getLearnedPatterns()).toBe(0)
  })
})
