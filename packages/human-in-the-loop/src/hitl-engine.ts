import { createLogger } from '@ideia/logger'
import { HITLGate, GateType, GateAction, EscalationPolicy, EscalationLevel, ApprovalResult, HITLConfig, Urgency } from './types'

const logger = createLogger('hitl-engine')

export class HITLEngine {
  private gates: Map<string, HITLGate> = new Map()
  private config: HITLConfig

  constructor(config?: Partial<HITLConfig>) {
    this.config = {
      defaultTimeoutMs: 300000,
      maxEscalationLevel: 'manager',
      notificationChannels: ['console'],
      autoApprovePatterns: [],
      ...config,
    }
  }

  createGate(agentId: string, action: string, context: string, riskLevel: string, type?: GateType): HITLGate {
    const gate: HITLGate = {
      id: `gate-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      type: type ?? 'pre-flight',
      agentId,
      action,
      context,
      riskLevel,
      urgency: riskLevel === 'critical' ? 'critical' as Urgency : 'medium' as Urgency,
      createdAt: new Date().toISOString(),
      status: 'pending',
      timeoutMs: this.config.defaultTimeoutMs,
    }
    this.gates.set(gate.id, gate)
    logger.info(`Gate created`, { id: gate.id, agentId, action, riskLevel })
    return gate
  }

  resolveGate(gateId: string, action: GateAction, reviewer: string, comments?: string): ApprovalResult {
    const gate = this.gates.get(gateId)
    if (!gate) throw new Error(`Gate ${gateId} not found`)
    gate.status = 'resolved'
    gate.resolvedBy = reviewer
    gate.resolution = action
    const result: ApprovalResult = { gateId, approved: action === 'approve', action, reviewer, timestamp: new Date().toISOString(), comments }
    logger.info(`Gate resolved`, { gateId, action, reviewer })
    return result
  }

  getPendingGates(): HITLGate[] {
    return [...this.gates.values()].filter(g => g.status === 'pending')
  }

  getGatesByAgent(agentId: string): HITLGate[] {
    return [...this.gates.values()].filter(g => g.agentId === agentId)
  }

  checkTimeouts(): string[] {
    const now = Date.now()
    const timedOut: string[] = []
    for (const gate of this.gates.values()) {
      if (gate.status === 'pending') {
        const elapsed = now - new Date(gate.createdAt).getTime()
        if (elapsed > gate.timeoutMs) {
          gate.status = 'timeout'
          timedOut.push(gate.id)
        }
      }
    }
    if (timedOut.length > 0) logger.warn(`Gates timed out`, { count: timedOut.length })
    return timedOut
  }

  shouldAutoApprove(action: string): boolean {
    return this.config.autoApprovePatterns?.some(p => new RegExp(p).test(action)) ?? false
  }
}
