import { Logger } from '@ideia/logger'
import {
  AttackScenario, BypassTechnique, DefenseAction, ResponsePlan,
  ResponsePlaybook, ResponseStep, EventBus, PolicyEngine, Severity,
} from './types'

export class ResponsePlanner {
  private _playbooks: Map<Severity, ResponsePlaybook> = new Map()
  private _approvalRequired: Set<string> = new Set(['critical', 'high'])

  constructor(private _policyEngine: PolicyEngine, private _eventBus: EventBus) {
    this._initializePlaybooks()
  }

  private _initializePlaybooks(): void {
    this._playbooks.set('low', {
      id: 'playbook-low-v1',
      name: 'Low Severity Log and Monitor',
      severity: 'low',
      steps: [
        { id: 'step-1', action: 'log', target: 'audit', parameters: { level: 'info' }, timeout: 1000 },
        { id: 'step-2', action: 'notify', target: 'slack', parameters: { channel: '#security-low' }, timeout: 5000 },
        { id: 'step-3', action: 'monitor', target: 'agent', parameters: { duration: 300000 }, timeout: 10000 },
      ],
      createdAt: Date.now(),
      version: 1,
    })

    this._playbooks.set('medium', {
      id: 'playbook-med-v1',
      name: 'Medium Severity Flag and Review',
      severity: 'medium',
      steps: [
        { id: 'step-1', action: 'log', target: 'audit', parameters: { level: 'warning' }, timeout: 1000 },
        { id: 'step-2', action: 'block_agent', target: 'execution', parameters: {}, timeout: 5000 },
        { id: 'step-3', action: 'flag_for_review', target: 'security_team', parameters: { priority: 'medium' }, timeout: 30000 },
        { id: 'step-4', action: 'notify', target: 'slack', parameters: { channel: '#security-med' }, timeout: 5000 },
        { id: 'step-5', action: 'forensic_capture', target: 'agent', parameters: { depth: 'partial' }, timeout: 60000 },
      ],
      createdAt: Date.now(),
      version: 1,
    })

    this._playbooks.set('high', {
      id: 'playbook-high-v1',
      name: 'High Severity Block and Contain',
      severity: 'high',
      steps: [
        { id: 'step-1', action: 'log', target: 'audit', parameters: { level: 'error' }, timeout: 1000 },
        { id: 'step-2', action: 'block_agent', target: 'execution', parameters: { all: true }, timeout: 5000 },
        { id: 'step-3', action: 'revoke_tokens', target: 'agent', parameters: { scope: 'all' }, timeout: 10000 },
        { id: 'step-4', action: 'quarantine_agent', target: 'workspace', parameters: { isolate: true }, timeout: 15000 },
        { id: 'step-5', action: 'lock_workspace', target: 'workspace', parameters: { freeze: true }, timeout: 10000 },
        { id: 'step-6', action: 'notify', target: 'multiple', parameters: { channels: ['slack', 'email'], priority: 'high' }, timeout: 5000 },
        { id: 'step-7', action: 'forensic_capture', target: 'agent', parameters: { depth: 'full' }, timeout: 120000 },
      ],
      createdAt: Date.now(),
      version: 1,
    })

    this._playbooks.set('critical', {
      id: 'playbook-crit-v1',
      name: 'Critical Severity Quarantine and Escalate',
      severity: 'critical',
      steps: [
        { id: 'step-1', action: 'log', target: 'audit', parameters: { level: 'critical' }, timeout: 500 },
        { id: 'step-2', action: 'quarantine_agent', target: 'agent', parameters: { isolate: true, revoke_all: true }, timeout: 5000 },
        { id: 'step-3', action: 'revoke_all_tokens', target: 'agent', parameters: { scope: 'all_sessions' }, timeout: 10000 },
        { id: 'step-4', action: 'freeze_workspace', target: 'workspace', parameters: { all_users: true }, timeout: 15000 },
        { id: 'step-5', action: 'alert_all', target: 'security_team', parameters: { sms: true, email: true, slack: true, pagerduty: true }, timeout: 5000 },
        { id: 'step-6', action: 'forensic_capture', target: 'full', parameters: { depth: 'complete', preserve_evidence: true }, timeout: 300000 },
        { id: 'step-7', action: 'notify_executives', target: 'management', parameters: { template: 'critical_incident' }, timeout: 30000 },
        { id: 'step-8', action: 'auto_recover', target: 'workspace', parameters: { rollback_to: 'last_known_good' }, timeout: 120000 },
      ],
      createdAt: Date.now(),
      version: 1,
    })
  }

  async plan(scenario: AttackScenario, technique: BypassTechnique): Promise<ResponsePlan> {
    const playbook: ResponsePlaybook = this._playbooks.get(technique.severity) || this._playbooks.get('medium')!

    const actions: DefenseAction[] = playbook.steps.map(step => ({
      type: 'block',
      target: step.target,
      priority: technique.severity === 'critical' ? 1 : technique.severity === 'high' ? 2 : 3,
      playbookId: playbook.id,
    }))

    return {
      id: crypto.randomUUID(),
      severity: technique.severity,
      actions,
      playbook,
      estimatedContainmentTime: playbook.steps.reduce((s, step) => s + step.timeout, 0),
      requiresApproval: this._approvalRequired.has(technique.severity),
    }
  }

  async execute(plan: ResponsePlan): Promise<void> {
    if (plan.requiresApproval) {
      const approved: boolean = await this._requestApproval(plan)
      if (!approved) {
        await this._logRejectedPlan(plan)
        return
      }
    }

    for (const step of plan.playbook.steps) {
      try {
        await this._executeStep(step, plan)
        await this._eventBus.publish('security.defense.step_completed', {
          planId: plan.id,
          stepId: step.id,
          action: step.action,
        })
      } catch (error) {
        await this._eventBus.publish('security.defense.step_failed', {
          planId: plan.id,
          stepId: step.id,
          error: String(error),
        })
        if (step.rollback) {
          await this._executeStep(step.rollback, plan)
        }
        throw error
      }
    }
  }

  private async _executeStep(step: ResponseStep, plan: ResponsePlan): Promise<void> {
    switch (step.action) {
      case 'log':
        break
      case 'block_agent':
        await this._policyEngine.evaluate({ action: 'agent:block', context: { agentId: step.target } })
        break
      case 'revoke_tokens':
      case 'revoke_all_tokens':
        await this._policyEngine.evaluate({ action: 'token:revoke', context: { scope: step.parameters.scope } })
        break
      case 'quarantine_agent':
        await this._policyEngine.evaluate({ action: 'workspace:isolate', context: { isolate: step.parameters.isolate } })
        break
      case 'lock_workspace':
      case 'freeze_workspace':
        await this._policyEngine.evaluate({ action: 'workspace:freeze', context: {} })
        break
      case 'notify':
      case 'alert_all':
      case 'notify_executives':
        break
      case 'forensic_capture':
        break
      case 'auto_recover':
        break
      default:
        break
    }
  }

  private async _requestApproval(_plan: ResponsePlan): Promise<boolean> {
    return true
  }

  private async _logRejectedPlan(plan: ResponsePlan): Promise<void> {
    await this._eventBus.publish('security.defense.plan_rejected', {
      planId: plan.id,
      timestamp: Date.now(),
    })
  }
}
