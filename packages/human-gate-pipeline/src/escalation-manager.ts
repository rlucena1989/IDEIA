import { EventEmitter } from 'events'
import { Channel, ApprovalRequest, ApprovalResult, ApprovalDecision, EscalationStep } from './types'
import { PendingActionsStore } from './pending-actions-store'
import { HitlResponseCallback } from './types'

export class EscalationManager {
  constructor(
    private timeouts: number[],
    private channelMatrix: Channel[][],
    private maxLevels: number,
    private eventBus: EventEmitter = new EventEmitter()
  ) {}

  async execute(
    request: ApprovalRequest,
    notifyFn: (req: ApprovalRequest, channel: Channel) => Promise<void>,
    fallbackAction: string,
    pendingStore?: PendingActionsStore
  ): Promise<ApprovalResult> {
    const levels = Math.min(this.maxLevels, this.timeouts.length)

    for (let level = 0; level < levels; level++) {
      request.level = (level + 1) as 1 | 2 | 3
      request.status = 'pending'
      const timeout = this.timeouts[level]
      const channels = this.channelMatrix[level] || this.channelMatrix[this.channelMatrix.length - 1]

      const step: EscalationStep = { level: level + 1, channels, timeout, result: 'timeout' }
      request.escalationPath.push(step)

      if (pendingStore) {
        pendingStore.update(request.id, {
          status: 'pending', level: request.level,
          lastNotificationAt: Date.now(), notificationsSent: level + 1,
        })
      }

      this.eventBus.emit('hitl.request.escalated', {
        type: 'hitl.request.escalated', requestId: request.id,
        timestamp: Date.now(), actor: 'system', payload: { level: level + 1, channels },
      })

      for (const channel of channels) await notifyFn(request, channel)

      const result = await this.waitForResponse(request, timeout, step)
      if (result !== 'timeout') {
        request.status = result === 'approved' ? 'approved' : 'rejected'
        step.result = 'responded'
        step.respondedAt = Date.now()
        return { decision: result as ApprovalDecision, approvedBy: `level_${level + 1}`, timestamp: Date.now(), notificationHistory: [] }
      }
      request.escalationPath[request.escalationPath.length - 1].result = 'timeout'
    }

    const backupId = request.context.metadata.backupHumanId
    if (typeof backupId === 'string') {
      const backupResult = await this.tryBackupHuman(request, notifyFn, fallbackAction)
      if (backupResult) return backupResult
    }

    request.status = 'timed_out'
    this.eventBus.emit('hitl.request.timed_out', {
      type: 'hitl.request.timed_out', requestId: request.id,
      timestamp: Date.now(), actor: 'system', payload: { escalationPath: request.escalationPath },
    })

    return this.handleTotalTimeout(request, fallbackAction)
  }

  private async waitForResponse(request: ApprovalRequest, timeout: number, step: EscalationStep): Promise<string> {
    return new Promise((resolve) => {
      const timer = setTimeout(() => resolve('timeout'), timeout)
      const handler: HitlResponseCallback = (response) => {
        if (response.requestId === request.id) {
          clearTimeout(timer)
          step.respondedAt = Date.now()
          step.respondedBy = response.approvedBy
          step.response = response.decision as ApprovalDecision
          resolve(response.decision)
        }
      }
      const g = globalThis as Record<string, unknown>
      g.hitlResponseCallback = handler
    })
  }

  private async tryBackupHuman(
    request: ApprovalRequest,
    notifyFn: (req: ApprovalRequest, channel: Channel) => Promise<void>,
    fallbackAction: string
  ): Promise<ApprovalResult | null> {
    const backupId = request.context.metadata.backupHumanId
    if (typeof backupId !== 'string') return null
    await notifyFn(request, 'sms')
    await notifyFn(request, 'pager')
    const backupTimeout = 300000
    const result = await this.waitForResponse(request, backupTimeout, {
      level: 5, channels: ['sms', 'pager'], timeout: backupTimeout, result: 'timeout',
    })
    if (result !== 'timeout') {
      return { decision: result as ApprovalDecision, approvedBy: `backup_${backupId}`, timestamp: Date.now(), notificationHistory: [] }
    }
    return null
  }

  private handleTotalTimeout(request: ApprovalRequest, fallbackAction: string): ApprovalResult {
    switch (fallbackAction) {
      case 'reject':
        return { decision: 'rejected', timestamp: Date.now(), reason: 'Total timeout exceeded all escalation levels (including backup)', notificationHistory: [] }
      case 'rollback':
        return { decision: 'fallback', timestamp: Date.now(), reason: 'Total timeout, using rollback plan', modifications: request.step, notificationHistory: [] }
      case 'continue':
        return { decision: 'approved', timestamp: Date.now(), reason: 'Total timeout, auto-continuing per default fallback policy', notificationHistory: [] }
      default:
        return { decision: 'rejected', timestamp: Date.now(), reason: `Total timeout, unknown fallback: ${fallbackAction}`, notificationHistory: [] }
    }
  }
}
