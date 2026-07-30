import { PPOEngine } from '../ppo-engine'

describe('PPOEngine', () => {
  let engine: PPOEngine
  beforeEach(() => { engine = new PPOEngine() })

  it('should select an action', () => {
    const state = { features: [0.5, 0.8], reward: 0, done: false }
    const actions = [{ id: 0, name: 'explore' }, { id: 1, name: 'exploit' }]
    const action = engine.selectAction(state, actions)
    expect(action.name).toBeDefined()
  })

  it('should train on episode data', () => {
    const states = [{ features: [1], reward: 0, done: false }, { features: [1], reward: 1, done: true }]
    const result = engine.train(1, states, [0, 0], [0, 10])
    expect(result.episode).toBe(1)
    expect(result.totalReward).toBe(10)
    expect(result.steps).toBe(2)
  })

  it('should decay epsilon over episodes', () => {
    for (let i = 0; i < 10; i++) engine.train(i, [{ features: [1], reward: 0, done: true }], [0], [1])
    const episodes = engine.getEpisodes()
    expect(episodes.length).toBe(10)
    expect(episodes[0].epsilon).toBeGreaterThan(episodes[9].epsilon)
  })

  it('should optimize planning', () => {
    for (let i = 0; i < 6; i++) engine.train(i, [{ features: [1], reward: 1, done: true }], [0], [10])
    const opt = engine.optimizePlanning('code-gen', 1000)
    expect(opt.taskType).toBe('code-gen')
    expect(opt.beforeCost).toBe(1000)
    expect(opt.afterCost).toBeLessThan(1000)
  })
})
