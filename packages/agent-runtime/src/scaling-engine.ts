import { createLogger } from '@ideia/logger'
import { ScalingDecision, ScalingStrategy, PoolType, ReactiveMetrics, PoolSizingRule, ScheduledEvent } from './types-scaling'
import { PoolManager } from './pool-manager'

const log = createLogger('agent-runtime:scaling-engine')

interface MovingAverageWindow {
  values: number[]
  windowSize: number
}

interface ExponentialSmoothingState {
  lastValue: number
  alpha: number
}

interface ScalingCooldown {
  lastAction: number
  periodMs: number
}

export class ScalingEngine {
  private poolManager: PoolManager
  private cooldownState: ScalingCooldown = { lastAction: 0, periodMs: 30000 }
  private movingAverages: Map<string, MovingAverageWindow> = new Map()
  private smoothingStates: Map<string, ExponentialSmoothingState> = new Map()
  private scheduledEvents: ScheduledEvent[] = []
  private eventTimers: Map<string, NodeJS.Timeout> = new Map()
  private scaleUpCount: number = 0
  private scaleDownCount: number = 0

  constructor(poolManager: PoolManager, cooldownPeriodMs: number = 30000) {
    this.poolManager = poolManager
    this.cooldownState.periodMs = cooldownPeriodMs
  }

  setCooldownPeriod(ms: number): void {
    this.cooldownState.periodMs = ms
  }

  scaleUp(count: number): ScalingDecision[] {
    const decisions: ScalingDecision[] = []
    if (!this.canAct()) {
      return [{ action: 'hold', count: 0, reason: 'cooldown active', strategy: 'reactive' }]
    }

    const pools = ['elastic', 'cold', 'warm'] as PoolType[]
    let remaining = count

    for (const poolType of pools) {
      if (remaining <= 0) break
      const rule = this.poolManager.getRule(poolType)
      if (!rule) continue
      const stats = this.poolManager.getPoolStats(poolType)
      const availableSlots = rule.maxSize - stats.totalSlots
      if (availableSlots <= 0) continue
      const toSpawn = Math.min(remaining, availableSlots)
      this.poolManager.preWarm(poolType, toSpawn)
      decisions.push({
        action: 'scale_up',
        count: toSpawn,
        reason: `scaled up ${toSpawn} in ${poolType} pool`,
        strategy: 'reactive',
      })
      remaining -= toSpawn
    }

    this.cooldownState.lastAction = Date.now()
    this.scaleUpCount += count
    return decisions
  }

  scaleDown(count: number): ScalingDecision[] {
    const decisions: ScalingDecision[] = []
    if (!this.canAct()) {
      return [{ action: 'hold', count: 0, reason: 'cooldown active', strategy: 'reactive' }]
    }

    const pools = ['warm', 'cold', 'elastic'] as PoolType[]
    let remaining = count

    for (const poolType of pools) {
      if (remaining <= 0) break
      const stats = this.poolManager.getPoolStats(poolType)
      const killable = stats.idleCount + stats.warmCount
      if (killable <= 0) continue
      const toKill = Math.min(remaining, killable)

      const poolHealth = this.poolManager.getPoolHealth(poolType)
      const agents = this.poolManager.getLifecycleController().getAgentsByPool(poolType)
      const killCandidates = agents.filter(a => a.state === 'idle' || a.state === 'warm')

      for (let i = 0; i < toKill && i < killCandidates.length; i++) {
        this.poolManager.kill(killCandidates[i].id)
      }

      decisions.push({
        action: 'scale_down',
        count: toKill,
        reason: `scaled down ${toKill} in ${poolType} pool`,
        strategy: 'reactive',
      })
      remaining -= toKill
    }

    this.cooldownState.lastAction = Date.now()
    this.scaleDownCount += count
    return decisions
  }

  getReactiveDecision(metrics: ReactiveMetrics): ScalingDecision {
    const reasons: string[] = []
    let netDelta = 0

    if (metrics.cpuPercent > 70) {
      const delta = Math.max(1, Math.ceil(metrics.activeTasks * 0.3))
      netDelta += delta
      reasons.push(`cpu ${metrics.cpuPercent}% > 70`)
    }

    if (metrics.queueDepth > metrics.activeTasks * 2 && metrics.activeTasks > 0) {
      const delta = Math.max(1, Math.ceil(metrics.queueDepth / 5))
      netDelta += delta
      reasons.push(`queue ${metrics.queueDepth} > 2x active`)
    }

    if (metrics.memoryPercent > 80) {
      const delta = Math.max(1, Math.ceil(metrics.memoryPercent / 10))
      netDelta += delta
      reasons.push(`memory ${metrics.memoryPercent}% > 80`)
    }

    if (metrics.idleCount > metrics.activeTasks * 0.5 && metrics.cpuPercent < 30 && metrics.activeTasks > 0) {
      const delta = -Math.max(1, Math.floor(metrics.idleCount * 0.5))
      netDelta += delta
      reasons.push(`idle ${metrics.idleCount} > 50% active`)
    }

    if (netDelta > 0) {
      const decisions = this.scaleUp(netDelta)
      const totalCount = decisions.reduce((sum, d) => sum + d.count, 0)
      return {
        action: 'scale_up',
        count: totalCount,
        reason: reasons.join('; '),
        strategy: 'reactive',
      }
    }

    if (netDelta < 0) {
      const decisions = this.scaleDown(Math.abs(netDelta))
      const totalCount = decisions.reduce((sum, d) => sum + d.count, 0)
      return {
        action: 'scale_down',
        count: totalCount,
        reason: reasons.join('; '),
        strategy: 'reactive',
      }
    }

    return { action: 'hold', count: 0, reason: 'no reactive trigger', strategy: 'reactive' }
  }

  recordMetricMovingAverage(key: string, value: number, windowSize: number = 60): void {
    let window = this.movingAverages.get(key)
    if (!window) {
      window = { values: [], windowSize }
      this.movingAverages.set(key, window)
    }
    window.values.push(value)
    if (window.values.length > window.windowSize) {
      window.values.splice(0, window.values.length - window.windowSize)
    }
  }

  getMovingAverage(key: string): number {
    const window = this.movingAverages.get(key)
    if (!window || window.values.length === 0) return 0
    return window.values.reduce((a, b) => a + b, 0) / window.values.length
  }

  recordExponentialSmoothing(key: string, value: number, alpha: number = 0.3): void {
    let state = this.smoothingStates.get(key)
    if (!state) {
      state = { lastValue: value, alpha }
      this.smoothingStates.set(key, state)
      return
    }
    state.lastValue = alpha * value + (1 - alpha) * state.lastValue
  }

  getSmoothedValue(key: string): number {
    const state = this.smoothingStates.get(key)
    if (!state) return 0
    return state.lastValue
  }

  getPredictiveDecision(poolType: PoolType, metricKey: string): ScalingDecision {
    const movingAvg = this.getMovingAverage(metricKey)
    const smoothed = this.getSmoothedValue(metricKey)
    const currentStats = this.poolManager.getPoolStats(poolType)
    const predictedDemand = (movingAvg * 0.4 + smoothed * 0.6) * 1.1

    if (predictedDemand > currentStats.totalSlots * 0.7 && currentStats.utilization > 0.6) {
      const delta = Math.max(1, Math.ceil(predictedDemand - currentStats.totalSlots * 0.7))
      return {
        action: 'scale_up',
        count: delta,
        reason: `predicted demand ${predictedDemand.toFixed(1)} exceeds 70% capacity`,
        strategy: 'predictive',
      }
    }

    if (predictedDemand < currentStats.totalSlots * 0.3 && currentStats.utilization < 0.4 && currentStats.idleCount > 2) {
      const delta = Math.max(1, Math.floor(currentStats.idleCount * 0.5))
      return {
        action: 'scale_down',
        count: delta,
        reason: `predicted demand ${predictedDemand.toFixed(1)} below 30% capacity`,
        strategy: 'predictive',
      }
    }

    return { action: 'hold', count: 0, reason: 'no predicted change', strategy: 'predictive' }
  }

  registerScheduledEvent(event: ScheduledEvent): void {
    this.scheduledEvents.push(event)
    this.scheduleEvent(event)
  }

  removeScheduledEvent(eventId: string): boolean {
    const timer = this.eventTimers.get(eventId)
    if (timer) {
      clearTimeout(timer)
      this.eventTimers.delete(eventId)
    }
    const idx = this.scheduledEvents.findIndex(e => e.id === eventId)
    if (idx >= 0) {
      this.scheduledEvents.splice(idx, 1)
      return true
    }
    return false
  }

  getScheduledEvents(): ScheduledEvent[] {
    return [...this.scheduledEvents]
  }

  handleWebhookScaleUp(poolType: PoolType, count: number): ScalingDecision {
    return this.handleEventTriggered('scale_up', `webhook:${poolType}`, count, poolType)
  }

  handleWebhookScaleDown(poolType: PoolType, count: number): ScalingDecision {
    return this.handleEventTriggered('scale_down', `webhook:${poolType}`, count, poolType)
  }

  handleCICDEvent(eventType: 'pipeline_start' | 'pipeline_complete'): ScalingDecision[] {
    if (eventType === 'pipeline_start') {
      const coldDecision = this.scaleUpWithoutCooldown('cold', 3, 'ci-cd:pipeline_start')
      const warmDecision = this.scaleUpWithoutCooldown('warm', 2, 'ci-cd:pipeline_start')
      this.cooldownState.lastAction = Date.now()
      return [coldDecision, warmDecision]
    }
    const coldDown = this.scaleDownWithoutCooldown('cold', 3, 'ci-cd:pipeline_complete')
    const warmDown = this.scaleDownWithoutCooldown('warm', 2, 'ci-cd:pipeline_complete')
    this.cooldownState.lastAction = Date.now()
    return [coldDown, warmDown]
  }

  getTotalScaleUps(): number {
    return this.scaleUpCount
  }

  getTotalScaleDowns(): number {
    return this.scaleDownCount
  }

  getScalingDecision(metrics: ReactiveMetrics, strategy: ScalingStrategy): ScalingDecision {
    switch (strategy) {
      case 'reactive':
        return this.getReactiveDecision(metrics)
      case 'predictive':
        return this.getPredictiveDecision('elastic', 'default_metric')
      case 'event-triggered':
        return this.getScheduledEvents().length > 0
          ? { action: 'hold', count: 0, reason: 'event-triggered active', strategy: 'event-triggered' }
          : { action: 'hold', count: 0, reason: 'no events scheduled', strategy: 'event-triggered' }
    }
  }

  reset(): void {
    for (const timer of this.eventTimers.values()) {
      clearTimeout(timer)
    }
    this.eventTimers.clear()
    this.scheduledEvents = []
    this.movingAverages.clear()
    this.smoothingStates.clear()
    this.cooldownState.lastAction = 0
    this.scaleUpCount = 0
    this.scaleDownCount = 0
  }

  private canAct(): boolean {
    return Date.now() - this.cooldownState.lastAction >= this.cooldownState.periodMs
  }

  private handleEventTriggered(
    action: 'scale_up' | 'scale_down',
    reason: string,
    count: number,
    poolType?: PoolType,
  ): ScalingDecision {
    const strategy: ScalingStrategy = 'event-triggered'

    if (!this.canAct()) {
      return { action: 'hold', count: 0, reason: `cooldown: ${reason}`, strategy }
    }

    if (action === 'scale_up') {
      if (poolType) {
        const rule = this.poolManager.getRule(poolType)
        if (rule) {
          const stats = this.poolManager.getPoolStats(poolType)
          const available = rule.maxSize - stats.totalSlots
          const actual = Math.min(count, available)
          if (actual > 0) {
            this.poolManager.preWarm(poolType, actual)
            this.cooldownState.lastAction = Date.now()
            this.scaleUpCount += actual
            return { action: 'scale_up', count: actual, reason, strategy }
          }
        }
      }
    }

    if (action === 'scale_down') {
      if (poolType) {
        const agents = this.poolManager.getLifecycleController().getAgentsByPool(poolType)
        const killable = agents.filter(a => a.state === 'idle' || a.state === 'warm')
        const toKill = Math.min(count, killable.length)
        for (let i = 0; i < toKill; i++) {
          this.poolManager.kill(killable[i].id)
        }
        if (toKill > 0) {
          this.cooldownState.lastAction = Date.now()
          this.scaleDownCount += toKill
          return { action: 'scale_down', count: toKill, reason, strategy }
        }
      }
    }

    return { action: 'hold', count: 0, reason: `no action taken: ${reason}`, strategy }
  }

  private scheduleEvent(event: ScheduledEvent): void {
    const msUntilNext = this.parseCronToMs(event.cron)
    const timer = setTimeout(() => {
      if (event.action === 'scale_up') {
        this.handleEventTriggered('scale_up', `scheduled:${event.id}`, event.count, event.poolType)
      } else {
        this.handleEventTriggered('scale_down', `scheduled:${event.id}`, event.count, event.poolType)
      }
      event.lastTriggered = Date.now()
      this.scheduleEvent(event)
    }, msUntilNext)

    if (timer && typeof timer === 'object' && 'unref' in timer) {
      timer.unref()
    }

    this.eventTimers.set(event.id, timer)
  }

  private parseCronToMs(_cron: string): number {
    return 60000
  }

  private scaleUpWithoutCooldown(poolType: PoolType, count: number, reason: string): ScalingDecision {
    const rule = this.poolManager.getRule(poolType)
    if (!rule) {
      return { action: 'hold', count: 0, reason: `no rule for ${poolType}`, strategy: 'event-triggered' }
    }
    const stats = this.poolManager.getPoolStats(poolType)
    const available = rule.maxSize - stats.totalSlots
    const actual = Math.min(count, available)
    if (actual > 0) {
      this.poolManager.preWarm(poolType, actual)
      this.scaleUpCount += actual
      return { action: 'scale_up', count: actual, reason, strategy: 'event-triggered' }
    }
    return { action: 'hold', count: 0, reason: `no capacity for ${poolType}`, strategy: 'event-triggered' }
  }

  private scaleDownWithoutCooldown(poolType: PoolType, count: number, reason: string): ScalingDecision {
    const agents = this.poolManager.getLifecycleController().getAgentsByPool(poolType)
    const killable = agents.filter(a => a.state === 'idle' || a.state === 'warm')
    const toKill = Math.min(count, killable.length)
    for (let i = 0; i < toKill; i++) {
      this.poolManager.kill(killable[i].id)
    }
    if (toKill > 0) {
      this.scaleDownCount += toKill
      return { action: 'scale_down', count: toKill, reason, strategy: 'event-triggered' }
    }
    return { action: 'hold', count: 0, reason: `no idle agents in ${poolType}`, strategy: 'event-triggered' }
  }
}
