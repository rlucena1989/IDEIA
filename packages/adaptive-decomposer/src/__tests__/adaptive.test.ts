import { AdaptiveDecomposer } from '../adaptive-decomposer'

describe('AdaptiveDecomposer', () => {
  let decomposer: AdaptiveDecomposer
  beforeEach(() => { decomposer = new AdaptiveDecomposer() })

  it('should decompose a task', () => {
    const result = decomposer.decompose({ id: 'T1', description: 'Implement login', complexity: 0.5, context: 'web' })
    expect(result.taskId).toBe('T1')
    expect(result.subtasks.length).toBeGreaterThan(0)
    expect(result.quality).toBeGreaterThan(0)
  })

  it('should select strategy based on complexity', () => {
    const simple = decomposer.decompose({ id: 'S1', description: 'Simple', complexity: 0.2, context: '' })
    const complex = decomposer.decompose({ id: 'C1', description: 'Complex', complexity: 0.9, context: '' })
    expect(simple.strategy).toBeDefined()
    expect(complex.strategy).toBeDefined()
  })

  it('should track strategy performance', () => {
    for (let i = 0; i < 5; i++) decomposer.decompose({ id: `T${i}`, description: `Task ${i}`, complexity: 0.5, context: '' })
    const perf = decomposer.getPerformance()
    expect(perf.length).toBe(4)
    expect(perf.some(p => p.useCount > 0)).toBe(true)
  })

  it('should identify best strategy', () => {
    for (let i = 0; i < 3; i++) decomposer.decompose({ id: `T${i}`, description: `T${i}`, complexity: 0.5, context: '' })
    const best = decomposer.getBestStrategy()
    expect(best.name).toBeDefined()
  })
})
