import { PoolManager } from '../pool-manager'

describe('PoolManager', () => {
  let pool: PoolManager

  beforeEach(() => { pool = new PoolManager({ warmPoolSize: 2, coldPoolSize: 1, maxElastic: 5, cooldownMs: 0 }) })

  it('should initialize warm pool', () => {
    const metrics = pool.getMetrics()
    expect(metrics.warmCount).toBe(2)
  })

  it('should acquire warm agent', () => {
    const agent = pool.acquireAgent('general')
    expect(agent).not.toBeNull()
    expect(agent!.status).toBe('active')
  })

  it('should spawn elastic agent when no warm available', () => {
    pool.acquireAgent('general')
    pool.acquireAgent('general')
    const agent = pool.acquireAgent('general')
    expect(agent!.poolType).toBe('elastic')
  })

  it('should release agent back to idle', () => {
    const agent = pool.acquireAgent('general')!
    pool.releaseAgent(agent.id)
    const metrics = pool.getMetrics()
    expect(metrics.idleCount).toBeGreaterThanOrEqual(1)
  })

  it('should evaluate scaling decision', () => {
    for (let i = 0; i < 5; i++) pool.acquireAgent('worker')
    const metrics = pool.getMetrics()
    const decision = pool.evaluateScaling(metrics)
    expect(decision.action).toBeDefined()
  })

  it('should cleanup idle elastic agents', () => {
    const agent = pool.acquireAgent('worker')!
    pool.releaseAgent(agent.id)
    const config = { warmPoolSize: 0, coldPoolSize: 0, maxElastic: 5, idleTimeoutMs: 0, cooldownMs: 0, scaleUpThreshold: 0.7, scaleDownThreshold: 0.2 }
    const pool2 = new PoolManager(config)
    const a = pool2.acquireAgent('worker')!
    pool2.releaseAgent(a.id)
    const cleaned = pool2.cleanupIdleAgents()
    expect(cleaned).toBe(1)
  })
})
