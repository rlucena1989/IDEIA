import { CircuitBreakerState } from './types'

export class HITLCircuitBreaker {
  private state: CircuitBreakerState

  constructor(maxPending = 50) {
    this.state = {
      engaged: false,
      emergencyStopActive: false,
      pendingRequestCount: 0,
      maxPendingThreshold: maxPending,
      rateLimitWindow: 60000,
      rateLimitMax: 100,
      rateCount: 0,
    }
  }

  isEngaged(): boolean { return this.state.engaged || this.state.emergencyStopActive }

  engage(reason: string, triggeredBy: string): void {
    this.state.engaged = true
    this.state.engagedAt = Date.now()
    this.state.engagedBy = triggeredBy
    this.state.reason = reason
  }

  disengage(): void {
    this.state.engaged = false
    this.state.disengagedAt = Date.now()
    this.state.emergencyStopActive = false
  }

  emergencyStop(reason: string, triggeredBy: string): void {
    this.state.emergencyStopActive = true
    this.state.engaged = true
    this.state.engagedAt = Date.now()
    this.state.engagedBy = triggeredBy
    this.state.reason = `EMERGENCY STOP: ${reason}`
  }

  incrementPending(): void {
    this.state.pendingRequestCount++
    this.state.rateCount++
    if (this.state.pendingRequestCount >= this.state.maxPendingThreshold) {
      this.engage(`Pending request threshold exceeded: ${this.state.pendingRequestCount}/${this.state.maxPendingThreshold}`, 'system')
    }
    if (this.state.rateCount > this.state.rateLimitMax) this.engage('Rate limit exceeded', 'system')
  }

  decrementPending(): void {
    this.state.pendingRequestCount = Math.max(0, this.state.pendingRequestCount - 1)
    if (this.state.engaged && !this.state.emergencyStopActive && this.state.pendingRequestCount < this.state.maxPendingThreshold * 0.5) {
      this.disengage()
    }
  }

  getState(): CircuitBreakerState { return { ...this.state } }

  resetRateLimit(): void { this.state.rateCount = 0 }
}
