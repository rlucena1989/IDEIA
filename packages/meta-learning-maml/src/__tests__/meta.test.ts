import { MetaLearner } from '../meta-learner'

describe('MetaLearner', () => {
  let learner: MetaLearner
  beforeEach(() => { learner = new MetaLearner({ innerSteps: 2, innerLR: 0.01, outerLR: 0.001, metaBatchSize: 2 }, { w1: 0.5, w2: 0.5, b: 0 }) })

  it('should adapt to a task', async () => {
    const result = await learner.adapt([
      { id: 't1', input: 'hello world', output: 'greeting', taskType: 'classify', metadata: {} },
    ])
    expect(result.success).toBeDefined()
    expect(result.steps).toBe(2)
    expect(Object.keys(result.adaptedParams).length).toBeGreaterThan(0)
  })

  it('should perform meta-update', async () => {
    const metaTask = [[{ id: 't1', input: 'test', output: 'result', taskType: 'classify', metadata: {} }]]
    const grad = await learner.metaUpdate(metaTask)
    expect(grad.loss).toBeGreaterThanOrEqual(0)
    expect(grad.parameters.w1).toBeDefined()
  })

  it('should adapt planning strategy', () => {
    const examples = [{ id: 'e1', input: 'input', output: 'output', taskType: 'plan', metadata: {} }]
    const result = learner.adaptPlanningStrategy({ depth: 3 }, examples)
    expect(result.strategyType).toBe('learned')
    expect(result.performanceGain).toBeGreaterThan(0)
  })

  it('should track parameters', () => {
    const params = learner.getParams()
    expect(params.w1).toBe(0.5)
  })
})
