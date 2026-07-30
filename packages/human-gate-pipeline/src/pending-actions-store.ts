import { PendingAction, ApprovalDecision } from './types'

export class PendingActionsStore {
  private actions: Map<string, PendingAction> = new Map()
  private maxPending: number
  private resolvers: Map<string, (decision: ApprovalDecision) => void> = new Map()

  constructor(maxPending = 50) {
    this.maxPending = maxPending
  }

  add(action: PendingAction): boolean {
    if (this.actions.size >= this.maxPending) return false
    this.actions.set(action.requestId, action)
    return true
  }

  get(requestId: string): PendingAction | undefined {
    return this.actions.get(requestId)
  }

  update(requestId: string, updates: Partial<PendingAction>): void {
    const existing = this.actions.get(requestId)
    if (existing) Object.assign(existing, updates)
  }

  resolve(requestId: string, decision: ApprovalDecision): void {
    const resolver = this.resolvers.get(requestId)
    if (resolver) {
      resolver(decision)
      this.resolvers.delete(requestId)
    }
    const action = this.actions.get(requestId)
    if (action) action.status = decision === 'approved' ? 'approved' : 'rejected'
    setTimeout(() => this.actions.delete(requestId), 60000)
  }

  cancelAll(reason: string): void {
    const g = globalThis as Record<string, unknown>
    const hitlCb = g.hitlResponseCallback
    for (const [requestId] of this.actions) {
      const resolver = this.resolvers.get(requestId)
      if (resolver) {
        resolver('rejected')
        this.resolvers.delete(requestId)
      }
      if (typeof hitlCb === 'function') {
        try { hitlCb({ requestId, decision: 'rejected', approvedBy: 'system' }) } catch { /* ignore */ }
      }
    }
    this.actions.clear()
  }

  count(): number { return this.actions.size }

  getPending(): PendingAction[] {
    return Array.from(this.actions.values()).filter(a => a.status === 'pending')
  }

  getExpired(): PendingAction[] {
    const now = Date.now()
    return Array.from(this.actions.values()).filter(a => a.expiresAt < now)
  }

  cleanExpired(): number {
    const expired = this.getExpired()
    for (const action of expired) this.actions.delete(action.requestId)
    return expired.length
  }

  getByAgent(agentId: string): PendingAction[] {
    return Array.from(this.actions.values()).filter(a => a.context.agentId === agentId)
  }

  getBySession(sessionId: string): PendingAction[] {
    return Array.from(this.actions.values()).filter(a => a.context.sessionId === sessionId)
  }
}
