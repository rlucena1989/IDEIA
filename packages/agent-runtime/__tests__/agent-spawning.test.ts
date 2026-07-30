import { AgentSpawner } from '../src/agent-spawning'
import { ScalingEngine } from '../src/scaling-engine'
import { PoolManager } from '../src/pool-manager'
import { AgentLifecycleController } from '../src/agent-lifecycle-controller'
import { DEFAULT_POOL_RULES, PoolType, ReactiveMetrics } from '../src/types-scaling'

describe('AgentLifecycleController', () => {
  let controller: AgentLifecycleController

  beforeEach(() => {
    controller = new AgentLifecycleController()
  })

  afterEach(() => {
    controller.reset()
  })

  it('should spawn an agent in spawning state', () => {
    const agent = controller.spawn('warm')
    expect(agent.state).toBe('spawning')
    expect(agent.poolType).toBe('warm')
    expect(agent.id).toBeTruthy()
  })

  it('should transition through valid states', () => {
    const agent = controller.spawn('warm')
    expect(controller.transitionTo(agent.id, 'warm')).toBe(true)
    expect(controller.transitionTo(agent.id, 'active')).toBe(true)
    expect(controller.transitionTo(agent.id, 'idle')).toBe(true)
    expect(controller.transitionTo(agent.id, 'hibernate')).toBe(true)
    expect(controller.transitionTo(agent.id, 'warm')).toBe(true)
    expect(controller.transitionTo(agent.id, 'kill')).toBe(true)
  })

  it('should reject invalid transitions', () => {
    const agent = controller.spawn('warm')
    expect(controller.transitionTo(agent.id, 'active')).toBe(false)
    expect(controller.transitionTo(agent.id, 'kill')).toBe(false)
  })

  it('should handle error recovery within limits', () => {
    const agent = controller.spawn('warm')
    controller.transitionTo(agent.id, 'warm')
    expect(controller.handleError(agent.id)).toBe(true)
    expect(controller.handleError(agent.id)).toBe(true)
    expect(controller.handleError(agent.id)).toBe(true)
    expect(controller.handleError(agent.id)).toBe(false)
  })

  it('should remove agent on kill', () => {
    const agent = controller.spawn('warm')
    controller.transitionTo(agent.id, 'warm')
    controller.transitionTo(agent.id, 'kill')
    controller.removeAgent(agent.id)
    expect(controller.getAgent(agent.id)).toBeUndefined()
  })

  it('should get state distribution', () => {
    const a1 = controller.spawn('warm')
    const a2 = controller.spawn('cold')
    controller.transitionTo(a1.id, 'warm')
    controller.transitionTo(a2.id, 'warm')
    const dist = controller.getStateDistribution()
    expect(dist.spawning).toBe(0)
    expect(dist.warm).toBe(2)
  })

  it('should get estimated latency for pool types', () => {
    expect(controller.getEstimatedLatencyMs('warm')).toEqual([0, 5])
    expect(controller.getEstimatedLatencyMs('cold')).toEqual([100, 500])
    expect(controller.getEstimatedLatencyMs('elastic')).toEqual([500, 2000])
    expect(controller.getEstimatedLatencyMs('dedicated')).toEqual([0, 0])
  })
})

describe('PoolManager', () => {
  let poolManager: PoolManager

  beforeEach(() => {
    poolManager = new PoolManager(DEFAULT_POOL_RULES)
  })

  it('should pre-warm default agents on construction', () => {
    const warmStats = poolManager.getPoolStats('warm')
    expect(warmStats.warmCount).toBeGreaterThanOrEqual(2)
  })

  it('should select available agent from pool', () => {
    const agent = poolManager.selectPool('warm')
    expect(agent).not.toBeNull()
    expect(agent!.state).toBe('active')
  })

  it('should recycle agent back to warm state', () => {
    const agent = poolManager.selectPool('warm')
    expect(agent).not.toBeNull()
    const recycled = poolManager.recycle(agent!.id)
    expect(recycled).toBe(true)
  })

  it('should kill agent and remove from pool', () => {
    const agent = poolManager.selectPool('warm')
    expect(agent).not.toBeNull()
    const killed = poolManager.kill(agent!.id)
    expect(killed).toBe(true)
  })

  it('should return pool stats', () => {
    const stats = poolManager.getPoolStats('warm')
    expect(stats.poolType).toBe('warm')
    expect(stats.activeCount).toBeGreaterThanOrEqual(0)
    expect(stats.warmCount).toBeGreaterThanOrEqual(0)
  })

  it('should report pool health', () => {
    const health = poolManager.getPoolHealth('warm')
    expect(health.poolType).toBe('warm')
    expect(typeof health.healthy).toBe('boolean')
    expect(typeof health.utilizationPercent).toBe('number')
  })

  it('should pre-warm additional agents', () => {
    const beforeStats = poolManager.getPoolStats('cold')
    poolManager.preWarm('cold', 5)
    const afterStats = poolManager.getPoolStats('cold')
    expect(afterStats.warmCount).toBeGreaterThanOrEqual(beforeStats.warmCount)
  })

  it('should not exceed max size when pre-warming', () => {
    poolManager.preWarm('dedicated', 100)
    const stats = poolManager.getPoolStats('dedicated')
    expect(stats.totalSlots).toBe(5)
  })
})

describe('AgentSpawner', () => {
  let spawner: AgentSpawner

  beforeEach(() => {
    const poolManager = new PoolManager(DEFAULT_POOL_RULES)
    spawner = new AgentSpawner(poolManager)
  })

  it('should spawn agent from warm pool', () => {
    const agent = spawner.spawn('warm')
    expect(agent).not.toBeNull()
    expect(agent!.poolType).toBe('warm')
  })

  it('should return null if pool is saturated', () => {
    const pm = new PoolManager([
      { poolType: 'dedicated', minSize: 1, maxSize: 1, targetUtilization: 0.5, ttlMs: 0, preWarmTimeoutMs: 0, scalingFactor: 1.0 },
    ])
    const s = new AgentSpawner(pm)
    const a1 = s.spawn('dedicated')
    expect(a1).not.toBeNull()
    const a2 = s.spawn('dedicated')
    expect(a2).toBeNull()
  })

  it('should get pool stats for all types', () => {
    const stats = spawner.getAllPoolStats()
    expect(stats.length).toBe(4)
    const types = stats.map(s => s.poolType)
    expect(types).toContain('warm')
    expect(types).toContain('cold')
    expect(types).toContain('elastic')
    expect(types).toContain('dedicated')
  })

  it('should recycle and kill agents', () => {
    const agent = spawner.spawn('warm')
    expect(agent).not.toBeNull()
    expect(spawner.recycle(agent!.id)).toBe(true)
    expect(spawner.kill(agent!.id)).toBe(true)
  })
})

describe('ScalingEngine', () => {
  let poolManager: PoolManager
  let engine: ScalingEngine

  beforeEach(() => {
    poolManager = new PoolManager(DEFAULT_POOL_RULES)
    engine = new ScalingEngine(poolManager, 0)
  })

  afterEach(() => {
    engine.reset()
  })

  it('should scale up based on reactive metrics', () => {
    const metrics: ReactiveMetrics = {
      cpuPercent: 85,
      queueDepth: 30,
      memoryPercent: 60,
      activeTasks: 10,
      idleCount: 0,
    }
    const decision = engine.getReactiveDecision(metrics)
    expect(decision.action).toBe('scale_up')
    expect(decision.count).toBeGreaterThan(0)
    expect(decision.strategy).toBe('reactive')
  })

  it('should scale down based on low cpu and high idle', () => {
    const metrics: ReactiveMetrics = {
      cpuPercent: 20,
      queueDepth: 1,
      memoryPercent: 30,
      activeTasks: 10,
      idleCount: 8,
    }
    const decision = engine.getReactiveDecision(metrics)
    expect(decision.action).toBe('scale_down')
    expect(decision.count).toBeGreaterThan(0)
  })

  it('should hold when metrics are within thresholds', () => {
    const metrics: ReactiveMetrics = {
      cpuPercent: 50,
      queueDepth: 5,
      memoryPercent: 50,
      activeTasks: 10,
      idleCount: 3,
    }
    const decision = engine.getReactiveDecision(metrics)
    expect(decision.action).toBe('hold')
  })

  it('should enforce cooldown period', () => {
    engine.setCooldownPeriod(5000)
    const result1 = engine.scaleUp(2)
    expect(result1.length).toBeGreaterThan(0)
    const result2 = engine.scaleUp(2)
    expect(result2[0].action).toBe('hold')
  })

  it('should scale down correctly', () => {
    const decisions = engine.scaleDown(2)
    expect(decisions.some(d => d.action === 'scale_down')).toBe(true)
  })

  it('should track moving average', () => {
    engine.recordMetricMovingAverage('queue', 10, 5)
    engine.recordMetricMovingAverage('queue', 20, 5)
    engine.recordMetricMovingAverage('queue', 30, 5)
    expect(engine.getMovingAverage('queue')).toBe(20)
  })

  it('should perform exponential smoothing', () => {
    engine.recordExponentialSmoothing('cpu', 50, 0.5)
    engine.recordExponentialSmoothing('cpu', 70, 0.5)
    engine.recordExponentialSmoothing('cpu', 90, 0.5)
    const smoothed = engine.getSmoothedValue('cpu')
    expect(smoothed).toBeGreaterThan(50)
  })

  it('should generate predictive scaling decision', () => {
    engine.recordMetricMovingAverage('tasks', 15, 10)
    engine.recordExponentialSmoothing('tasks', 18, 0.3)
    const decision = engine.getPredictiveDecision('elastic', 'tasks')
    expect(['scale_up', 'hold', 'scale_down']).toContain(decision.action)
  })

  it('should handle scheduled events', () => {
    engine.registerScheduledEvent({
      id: 'test-event',
      cron: '* * * * *',
      action: 'scale_up',
      count: 3,
      poolType: 'warm',
    })
    expect(engine.getScheduledEvents().length).toBe(1)
    engine.removeScheduledEvent('test-event')
    expect(engine.getScheduledEvents().length).toBe(0)
  })

  it('should handle webhook triggered scale up', () => {
    const decision = engine.handleWebhookScaleUp('warm', 3)
    expect(decision.action).toBe('scale_up')
    expect(decision.count).toBe(3)
    expect(decision.strategy).toBe('event-triggered')
  })

  it('should handle CI-CD events', () => {
    const decisions = engine.handleCICDEvent('pipeline_start')
    expect(decisions.length).toBe(2)
    expect(decisions.every(d => d.action === 'scale_up')).toBe(true)

    const downDecisions = engine.handleCICDEvent('pipeline_complete')
    expect(downDecisions.every(d => d.action === 'scale_down')).toBe(true)
  })

  it('should track total scale ups and downs', () => {
    engine.scaleUp(3)
    engine.scaleDown(1)
    expect(engine.getTotalScaleUps()).toBe(3)
    expect(engine.getTotalScaleDowns()).toBe(1)
  })
})
