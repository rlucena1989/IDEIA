import { createLogger } from '@ideia/logger'
import { EscalationPolicy, EscalationStep, EscalationLevel, HITLGate } from './types'

const logger = createLogger('escalation-engine')

export class EscalationEngine {
  private policies: Map<string, EscalationPolicy> = new Map()

  registerPolicy(policy: EscalationPolicy): void {
    this.policies.set(policy.id, policy)
    logger.info(`Policy registered`, { id: policy.id, name: policy.name })
  }

  getEscalationStep(gate: HITLGate, elapsedMs: number): EscalationStep | null {
    for (const policy of this.policies.values()) {
      const conditionsMet = policy.conditions.every(c => {
        const value = c.metric === 'riskLevel' ? this.riskToNumber(gate.riskLevel) : elapsedMs / 1000
        switch (c.operator) {
          case '>': return value > c.value
          case '<': return value < c.value
          case '>=': return value >= c.value
          case '==': return value === c.value
        }
      })
      if (conditionsMet) {
        const applicable = policy.steps.filter(s => elapsedMs >= s.notifyAfterMs)
        if (applicable.length > 0) return applicable[applicable.length - 1]
      }
    }
    return null
  }

  private riskToNumber(risk: string): number {
    const map: Record<string, number> = { low: 1, medium: 2, high: 3, critical: 4 }
    return map[risk.toLowerCase()] ?? 2
  }
}
