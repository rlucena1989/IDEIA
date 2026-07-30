import { createHash, randomUUID } from 'crypto'
import { Step, Context, ApprovalResult, ApprovalLogEntry } from './types'

export class ApprovalLogger {
  private chain: ApprovalLogEntry[] = []

  async log(step: Step, context: Context, result: ApprovalResult): Promise<ApprovalLogEntry> {
    const previousHash = this.chain.length > 0
      ? this.chain[this.chain.length - 1].hash
      : '0'.repeat(64)

    const entry: ApprovalLogEntry = {
      id: randomUUID(),
      requestId: result.auditHash || randomUUID(),
      stepId: step.id,
      stepDescription: step.description,
      action: step.type,
      decision: result.decision,
      approvedBy: result.approvedBy || null,
      level: context.risk > 0.6 ? 2 : 1,
      risk: context.risk,
      confidence: context.confidence,
      environment: context.environment,
      agentId: context.agentId,
      sessionId: context.sessionId,
      traceId: context.traceId,
      timestamp: result.timestamp,
      responseTime: result.timestamp - Date.now() + 1000,
      channel: result.notificationHistory[0]?.channel || 'system',
      hash: '',
      previousHash,
      metadata: {
        urgency: context.urgency,
        impact: step.impact,
        modifications: result.modifications,
        notificationCount: result.notificationHistory.length,
        notificationSuccess: result.notificationHistory.filter(n => n.success).length,
        autonomyLevel: context.autonomyLevel,
        reason: result.reason,
      },
    }
    entry.hash = this.computeHash(previousHash, result)
    this.chain.push(entry)
    return entry
  }

  private computeHash(previousHash: string, result: ApprovalResult): string {
    const content = `${previousHash}|${result.decision}|${result.timestamp}|${result.approvedBy || ''}|${result.reason || ''}`
    return createHash('sha256').update(content).digest('hex')
  }

  verifyChain(): boolean {
    for (let i = 1; i < this.chain.length; i++) {
      const reason = (this.chain[i].metadata?.reason as string) || ''
      const expected = this.computeHash(
        this.chain[i - 1].hash,
        { decision: this.chain[i].decision, timestamp: this.chain[i].timestamp, approvedBy: this.chain[i].approvedBy || undefined, reason, notificationHistory: [] }
      )
      if (this.chain[i].hash !== expected) return false
    }
    return true
  }

  getStats(): { total: number; autoApproved: number; rejected: number; approved: number; avgResponseTime: number; escalationRate: number } {
    const autoApproved = this.chain.filter(e => e.decision === 'auto-approved').length
    const rejected = this.chain.filter(e => e.decision === 'rejected').length
    const approved = this.chain.filter(e => e.decision === 'approved').length
    const total = this.chain.length || 1
    const avgResponseTime = this.chain.length > 0
      ? this.chain.reduce((sum, e) => sum + e.responseTime, 0) / this.chain.length
      : 0
    const escalated = this.chain.filter(e => e.decision === 'escalated').length
    return { total: this.chain.length, autoApproved, rejected, approved, avgResponseTime, escalationRate: escalated / total }
  }

  getChainLength(): number { return this.chain.length }

  getChain(): ApprovalLogEntry[] { return [...this.chain] }
}
