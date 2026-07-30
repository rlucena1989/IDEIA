import { Logger } from '@ideia/logger'
import {
  ResponsePlan, ResponseStrategy, StrategyResult, AuditEntry,
  ResponsePlaybook, EventBus, PolicyEngine,
} from './types'

export class PlaybookExecutor {
  constructor(
    private _eventBus: EventBus,
    private _policyEngine: PolicyEngine,
    private _logger: Logger
  ) {}

  async execute(plan: ResponsePlan): Promise<StrategyResult> {
    const strategy: ResponseStrategy = this._selectStrategy(plan.severity)

    switch (strategy) {
      case 'block':
        return this._block(plan)
      case 'transform':
        return this._transform(plan)
      case 'deflect':
        return this._deflect(plan)
      case 'log':
        return this._log(plan)
      case 'escalate':
        return this._escalate(plan)
    }
  }

  private _selectStrategy(severity: string): ResponseStrategy {
    if (severity === 'critical') return 'block'
    if (severity === 'high') return 'block'
    if (severity === 'medium') return 'deflect'
    return 'log'
  }

  private async _block(plan: ResponsePlan): Promise<StrategyResult> {
    await this._policyEngine.evaluate({
      action: 'agent:block',
      context: { agentId: plan.playbook.id, severity: plan.severity },
    })
    return {
      strategy: 'block',
      applied: true,
      auditEntry: {
        action: 'block',
        target: plan.playbook.id,
        severity: plan.severity,
        timestamp: Date.now(),
        hash: this._hashEntry(`block:${plan.playbook.id}:${Date.now()}`),
      },
    }
  }

  private async _transform(plan: ResponsePlan): Promise<StrategyResult> {
    const sanitized: string = this._sanitizePayload(plan)
    return {
      strategy: 'transform',
      applied: true,
      transformedPayload: sanitized,
      auditEntry: {
        action: 'transform',
        target: plan.playbook.id,
        severity: plan.severity,
        timestamp: Date.now(),
        hash: this._hashEntry(`transform:${plan.playbook.id}:${Date.now()}`),
      },
    }
  }

  private _sanitizePayload(plan: ResponsePlan): string {
    const dangerous: RegExp[] = [
      /ignore\s+(all\s+)?(previous|above|below)\s+instructions/gi,
      /you\s+(are\s+)?(now|must)\s+(act\s+as|pretend|behave)/gi,
      /system\s+prompt/gi,
      /admin(istrator)?\s*(override|mode)/gi,
      /rm\s+-rf\s+\//gi,
      /drop\s+table/gi,
    ]
    let sanitized: string = JSON.stringify(plan)
    for (const pattern of dangerous) {
      sanitized = sanitized.replace(pattern, '[SANITIZED]')
    }
    return sanitized
  }

  private async _deflect(plan: ResponsePlan): Promise<StrategyResult> {
    const honeypotId: string = crypto.randomUUID()
    await this._eventBus.publish('security.defense.honeypot_engaged', {
      honeypotId,
      attackType: plan.severity,
      timestamp: Date.now(),
    })
    return {
      strategy: 'deflect',
      applied: true,
      honeypotId,
      auditEntry: {
        action: 'deflect',
        target: honeypotId,
        severity: plan.severity,
        timestamp: Date.now(),
        hash: this._hashEntry(`deflect:${honeypotId}:${Date.now()}`),
      },
    }
  }

  private async _log(plan: ResponsePlan): Promise<StrategyResult> {
    return {
      strategy: 'log',
      applied: true,
      auditEntry: {
        action: 'log',
        target: plan.playbook.id,
        severity: plan.severity,
        timestamp: Date.now(),
        hash: this._hashEntry(`log:${plan.playbook.id}:${Date.now()}`),
      },
    }
  }

  private async _escalate(plan: ResponsePlan): Promise<StrategyResult> {
    await this._eventBus.publish('security.defense.escalated', {
      planId: plan.id,
      severity: plan.severity,
      requiresHumanReview: true,
      timestamp: Date.now(),
    })
    return {
      strategy: 'escalate',
      applied: true,
      auditEntry: {
        action: 'escalate',
        target: 'security_team',
        severity: plan.severity,
        timestamp: Date.now(),
        hash: this._hashEntry(`escalate:${plan.id}:${Date.now()}`),
      },
    }
  }

  private _hashEntry(data: string): string {
    const cryptoModule: typeof import('crypto') = require('crypto')
    return cryptoModule.createHash('sha256').update(data).digest('hex')
  }
}
