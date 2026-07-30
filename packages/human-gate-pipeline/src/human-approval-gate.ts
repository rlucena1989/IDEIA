import { EventEmitter } from 'events'
import { randomUUID, createHash } from 'crypto'
import { createLogger } from '@ideia/logger'
import { Step, Context, ApprovalResult, ApprovalDecision, ApprovalRequest, PendingAction, HITLConfig, HITLStats, ApprovalLogEntry, CircuitBreakerState } from './types'
import { NotificationRouter } from './notification-router'
import { NotificationChannel } from './types'
import { PendingActionsStore } from './pending-actions-store'
import { HITLCircuitBreaker } from './circuit-breaker'
import { ApprovalLogger } from './approval-logger'
import { EscalationManager } from './escalation-manager'

export { NotificationRouter, EscalationManager, ApprovalLogger, PendingActionsStore, HITLCircuitBreaker }

const logger = createLogger('human-gate:gate')

export class HumanApprovalGate {
  private notifier: NotificationRouter
  private escalationManager: EscalationManager
  private approvalLogger: ApprovalLogger
  private pendingStore: PendingActionsStore
  private circuitBreaker: HITLCircuitBreaker
  private eventBus: EventEmitter
  private config: HITLConfig

  constructor(config: Partial<HITLConfig> = {}, channels?: NotificationChannel[], eventBus?: EventEmitter) {
    this.config = {
      autoApproveThreshold: 0.95, maxRiskForAutoApprove: 0.3,
      escalationTimeouts: [300000, 600000, 900000, 1800000],
      escalationChannels: [['theia_widget', 'theia_toast'], ['slack'], ['email'], ['sms', 'pager']],
      maxEscalationLevels: 4, defaultFallback: 'reject', requireTwoFactor: false,
      auditLogEnabled: true, adaptiveEnabled: false, circuitBreakerEnabled: true,
      maxPendingRequests: 50, requestExpiryMs: 86400000, backupHumanIds: [],
      ...config,
    }
    this.eventBus = eventBus || new EventEmitter()
    this.notifier = new NotificationRouter(channels, this.eventBus)
    this.escalationManager = new EscalationManager(
      this.config.escalationTimeouts, this.config.escalationChannels, this.config.maxEscalationLevels, this.eventBus
    )
    this.approvalLogger = new ApprovalLogger()
    this.pendingStore = new PendingActionsStore(this.config.maxPendingRequests)
    this.circuitBreaker = new HITLCircuitBreaker(this.config.maxPendingRequests)
  }

  async requestApproval(step: Step, context: Context): Promise<ApprovalResult> {
    const notificationHistory: import('./types').NotificationRecord[] = []

    if (this.config.circuitBreakerEnabled && this.circuitBreaker.isEngaged()) {
      return { decision: 'fallback', timestamp: Date.now(), reason: 'Circuit breaker engaged — request rejected automatically', notificationHistory }
    }

    if (this.canAutoApprove(context)) {
      const result: ApprovalResult = {
        decision: 'auto-approved', timestamp: Date.now(),
        reason: `confidence=${context.confidence.toFixed(2)} risk=${context.risk.toFixed(2)}`,
        notificationHistory, auditHash: this.computeAuditHash('auto-approved', Date.now(), 'system'),
      }
      await this.approvalLogger.log(step, context, result)
      this.eventBus.emit('hitl.request.created', {
        type: 'hitl.request.created', requestId: 'auto-' + randomUUID(),
        timestamp: Date.now(), actor: 'system',
        payload: { decision: 'auto-approved', risk: context.risk, confidence: context.confidence },
      })
      return result
    }

    const requiredLevel = this.determineApprovalLevel(step, context)
    const request: ApprovalRequest = {
      id: randomUUID(), step, context, status: 'pending', level: requiredLevel,
      createdAt: Date.now(), escalationPath: [], traceId: context.traceId, sessionId: context.sessionId,
    }
    const pendingAction: PendingAction = {
      requestId: request.id, step, context, level: requiredLevel, status: 'pending',
      createdAt: Date.now(), expiresAt: Date.now() + this.config.requestExpiryMs,
      notificationsSent: 0, lastNotificationAt: Date.now(),
      decisionDeadline: Date.now() + this.config.escalationTimeouts.reduce((a, b) => a + b, 0),
    }
    this.pendingStore.add(pendingAction)
    this.circuitBreaker.incrementPending()

    this.eventBus.emit('hitl.request.created', {
      type: 'hitl.request.created', requestId: request.id,
      timestamp: Date.now(), actor: context.agentId,
      payload: { step: step.description, risk: context.risk, level: requiredLevel },
    })

    try {
      const result = await this.escalationManager.execute(
        request, (req, channel) => this.sendNotification(req, channel, notificationHistory),
        this.config.defaultFallback, this.pendingStore
      )
      result.notificationHistory = notificationHistory
      result.auditHash = this.computeAuditHash(result.decision, result.timestamp, result.approvedBy || 'system')
      await this.approvalLogger.log(step, context, result)
      this.pendingStore.resolve(request.id, result.decision)
      this.circuitBreaker.decrementPending()
      this.eventBus.emit('hitl.request.responded', {
        type: 'hitl.request.responded', requestId: request.id,
        timestamp: Date.now(), actor: result.approvedBy || 'system', payload: { decision: result.decision },
      })
      return result
    } catch (err) {
      const fallback: ApprovalResult = {
        decision: 'fallback', timestamp: Date.now(),
        reason: `Approval failed: ${err}, using fallback: ${this.config.defaultFallback}`, notificationHistory,
      }
      await this.approvalLogger.log(step, context, fallback)
      this.pendingStore.resolve(request.id, 'fallback')
      this.circuitBreaker.decrementPending()
      return fallback
    }
  }

  private canAutoApprove(context: Context): boolean {
    return context.confidence >= this.config.autoApproveThreshold && context.risk <= this.config.maxRiskForAutoApprove
  }

  private determineApprovalLevel(step: Step, context: Context): 1 | 2 | 3 {
    if (step.impact === 'critical' || step.type === 'delete' || step.type === 'rollback') return 3
    if (context.risk > 0.6 || context.environment === 'prod') return 2
    return 1
  }

  private async sendNotification(request: ApprovalRequest, channel: import('./types').Channel, history: import('./types').NotificationRecord[]): Promise<void> {
    const start = Date.now()
    try {
      await this.notifier.send({
        channel, requestId: request.id,
        title: `[${request.level === 3 ? 'SECURITY' : request.level === 2 ? 'APPROVAL' : 'REVIEW'}] ${request.step.description}`,
        body: this.formatApprovalMessage(request),
        actions: ['approve', 'reject', ...(request.level < 3 ? ['modify'] as const : [])],
        priority: request.context.urgency > 0.7 ? 'high' : 'normal',
        metadata: { stepId: request.step.id, agentId: request.context.agentId, sessionId: request.context.sessionId, traceId: request.context.traceId, environment: request.context.environment },
      })
      history.push({ channel, timestamp: Date.now(), success: true, responseTime: Date.now() - start })
    } catch (err) {
      history.push({ channel, timestamp: Date.now(), success: false, responseTime: Date.now() - start, error: `${err}` })
      this.eventBus.emit('hitl.notification.failed', {
        type: 'hitl.notification.failed', requestId: request.id,
        timestamp: Date.now(), actor: 'system', payload: { channel, error: `${err}` },
      })
    }
  }

  private formatApprovalMessage(request: ApprovalRequest): string {
    const lines = [
      `**Action:** ${request.step.description}`, `**Type:** ${request.step.type}`,
      `**Target:** ${request.step.target}`, `**Impact:** ${request.step.impact}`,
      `**Risk:** ${(request.context.risk * 100).toFixed(0)}%`,
      `**Confidence:** ${(request.context.confidence * 100).toFixed(0)}%`,
      `**Environment:** ${request.context.environment}`, `**Level:** ${request.level}`,
      `**Agent:** ${request.context.agentId}`, `**Autonomy Level:** ${request.context.autonomyLevel || 'guided'}`,
    ]
    if (request.step.rollbackPlan) lines.push(`**Rollback:** ${request.step.rollbackPlan}`)
    if (Object.keys(request.step.parameters).length > 0) lines.push(`**Parameters:** ${JSON.stringify(request.step.parameters, null, 2)}`)
    return lines.join('\n')
  }

  private computeAuditHash(decision: ApprovalDecision, timestamp: number, approvedBy: string): string {
    return createHash('sha256').update(`${decision}|${timestamp}|${approvedBy}`).digest('hex')
  }

  emergencyStop(reason: string, triggeredBy: string): void {
    this.circuitBreaker.engage(reason, triggeredBy)
    this.pendingStore.cancelAll(`Emergency stop: ${reason}`)
    this.eventBus.emit('hitl.emergency_stop', {
      type: 'hitl.emergency_stop', requestId: 'emergency',
      timestamp: Date.now(), actor: triggeredBy, payload: { reason },
    })
  }

  manualOverride(requestId: string, decision: ApprovalDecision, approvedBy: string, reason: string): boolean {
    const action = this.pendingStore.get(requestId)
    if (!action) return false
    this.pendingStore.resolve(requestId, decision)
    this.eventBus.emit('hitl.request.responded', {
      type: 'hitl.request.responded', requestId, timestamp: Date.now(),
      actor: approvedBy, payload: { decision, reason: 'manual_override' },
    })
    return true
  }

  getStats(): HITLStats {
    const stats = this.approvalLogger.getStats()
    return {
      pendingCount: this.pendingStore.count(),
      autoApprovalRate: stats.autoApproved / Math.max(1, stats.total),
      circuitBreakerEngaged: this.circuitBreaker.isEngaged(),
      averageResponseTime: stats.avgResponseTime,
      totalDecisions: stats.total,
    }
  }

  getPendingRequestIds(): string[] { return this.pendingStore.getPending().map(a => a.requestId) }

  getCircuitBreakerState(): CircuitBreakerState { return this.circuitBreaker.getState() }

  getAuditChain(): ApprovalLogEntry[] { return this.approvalLogger.getChain() }
}
