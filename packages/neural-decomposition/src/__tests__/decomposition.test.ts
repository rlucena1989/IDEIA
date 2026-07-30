import { DecompositionEngine } from '../decomposition-engine'
import { RLState } from '../types'

describe('DecompositionEngine', () => {
  let engine: DecompositionEngine

  beforeEach(() => {
    engine = new DecompositionEngine()
  })

  it('should decompose a simple task', () => {
    const result = engine.decompose('Create a login page with email and password', 'moderate')
    expect(result.originalTask).toContain('login')
    expect(result.subtasks.length).toBeGreaterThan(0)
    expect(result.depth).toBeGreaterThan(0)
    expect(result.strategy).toBe('top-down')
  })

  it('should decompose a complex task with RL strategy', () => {
    const longDesc = 'Design authentication system with OAuth2. Configure JWT tokens with refresh rotation. Implement rate limiting across API gateway. Set up session management microservices. Deploy monitoring stack with logging. Configure scalability with auto-scaling groups. Ensure reliability with circuit breakers. Maintain availability with multi-region failover.'
    const result = engine.decompose(longDesc, 'very-complex')
    expect(result.strategy).toBe('rl-optimized')
    expect(result.totalSubtasks).toBeGreaterThan(1)
  })

  it('should calculate RL rewards', () => {
    const state: RLState = { taskId: 't1', remainingSubtasks: 5, tokensUsed: 1000, timeElapsed: 30, quality: 0.5 }
    const nextState: RLState = { taskId: 't1', remainingSubtasks: 3, tokensUsed: 800, timeElapsed: 45, quality: 0.7 }
    const action = { type: 'decompose' as const, target: 't1', expectedReward: 8 }
    const reward = engine.calculateRLReward(state, action, nextState)
    expect(reward).toBeGreaterThan(0)
  })

  it('should select optimal action', () => {
    const state: RLState = { taskId: 't1', remainingSubtasks: 5, tokensUsed: 1000, timeElapsed: 30, quality: 0.5 }
    const action = engine.selectOptimalAction(state)
    expect(action.type).toBe('decompose')
  })

  it('should select execute for small remaining subtasks', () => {
    const state: RLState = { taskId: 't1', remainingSubtasks: 1, tokensUsed: 1000, timeElapsed: 30, quality: 0.5 }
    const action = engine.selectOptimalAction(state)
    expect(action.type).toBe('execute')
  })

  it('should optimize task decomposition', () => {
    const result = engine.optimize('t1', 'Create a scalable microservice architecture with Docker, Kubernetes, CI/CD pipeline, monitoring, and logging', 'complex')
    expect(result.originalCost).toBeGreaterThan(0)
    expect(result.savingsPercent).toBeGreaterThanOrEqual(0)
    expect(result.recommendations.length).toBeGreaterThan(0)
  })

  it('should return available strategies', () => {
    const strategies = engine.getStrategies()
    expect(strategies.length).toBe(4)
    expect(strategies.some(s => s.type === 'rl-optimized')).toBe(true)
  })
})
