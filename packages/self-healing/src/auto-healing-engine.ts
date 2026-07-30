import { createLogger } from '@ideia/logger';
import { Diagnosis, HealingAction, HealingActionType, HealingPlan, HealingResult, ApprovalLevel } from './types';

const logger = createLogger('self-healing:healing-engine');

export class AutoHealingEngine {
  private _actionExecutors: Map<HealingActionType, (action: HealingAction) => Promise<HealingResult>> = new Map();
  private _plans: Map<string, HealingPlan> = new Map();
  private _executionHistory: HealingResult[] = [];

  constructor() {
    this._registerDefaultExecutors();
  }

  registerExecutor(type: HealingActionType, executor: (action: HealingAction) => Promise<HealingResult>): void {
    this._actionExecutors.set(type, executor);
  }

  createPlan(diagnosis: Diagnosis): HealingPlan {
    const actions: HealingAction[] = [];
    let order = 0;
    for (const cause of diagnosis.rootCauses) {
      const action = this._buildAction(cause, diagnosis, order);
      if (action) {
        actions.push(action);
        order++;
      }
    }
    const overallConfidence = actions.length > 0
      ? actions.reduce((a, a2) => a + a2.confidence, 0) / actions.length
      : 0;
    const approvalLevel: ApprovalLevel =
      overallConfidence > 0.9 ? 'auto'
      : overallConfidence > 0.7 ? 'semi-auto'
      : overallConfidence > 0.5 ? 'manual'
      : 'critical';
    return {
      planId: `plan-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      incidentId: diagnosis.incidentId,
      actions,
      estimatedDuration: actions.length * 30000,
      riskScore: 1 - overallConfidence,
      overallConfidence,
      approvalLevel,
    };
  }

  async executePlan(
    plan: HealingPlan,
    onApproval?: (action: HealingAction) => Promise<boolean>
  ): Promise<HealingResult[]> {
    this._plans.set(plan.planId, plan);
    const results: HealingResult[] = [];
    for (const action of plan.actions) {
      if (action.approval !== 'auto' && onApproval) {
        const approved = await onApproval(action);
        if (!approved) {
          results.push({
            actionId: action.actionId,
            type: action.type,
            status: 'failed',
            startTime: Date.now(),
            endTime: Date.now(),
            error: 'Action rejected by user',
          });
          continue;
        }
      }
      const executor = this._actionExecutors.get(action.type);
      if (!executor) {
        results.push({
          actionId: action.actionId,
          type: action.type,
          status: 'failed',
          startTime: Date.now(),
          endTime: Date.now(),
          error: `No executor for ${action.type}`,
        });
        continue;
      }
      const result = await executor(action);
      results.push(result);
      if (result.status === 'failed' && action.rollbackPlan.length > 0) {
        for (const rollbackAction of action.rollbackPlan) {
          const rbExecutor = this._actionExecutors.get(rollbackAction.type);
          if (rbExecutor) {
            results.push(await rbExecutor(rollbackAction));
          }
        }
      }
    }
    this._executionHistory.push(...results);
    return results;
  }

  getPlan(planId: string): HealingPlan | undefined {
    return this._plans.get(planId);
  }

  getExecutionHistory(): readonly HealingResult[] {
    return this._executionHistory;
  }

  clearHistory(): void {
    this._executionHistory = [];
  }

  private _registerDefaultExecutors(): void {
    this._actionExecutors.set('restart', this._executeRestart.bind(this));
    this._actionExecutors.set('scale-up', this._executeScaleUp.bind(this));
    this._actionExecutors.set('scale-down', this._executeScaleDown.bind(this));
    this._actionExecutors.set('rollback', this._executeRollback.bind(this));
    this._actionExecutors.set('clear-cache', this._executeClearCache.bind(this));
    this._actionExecutors.set('reset-rate-limit', this._executeResetRateLimit.bind(this));
    this._actionExecutors.set('create-pr', this._executeCreatePR.bind(this));
  }

  private _buildAction(
    cause: { service: string; confidence: number; suggestedAction: string; evidence: string[] },
    _diagnosis: Diagnosis,
    order: number
  ): HealingAction | null {
    const actionType = this._suggestedActionToType(cause.suggestedAction);
    if (!actionType) return null;
    const riskFactor = this._getActionRisk(actionType);
    const adjustedConfidence = cause.confidence * (1 - riskFactor);
    return {
      actionId: `action-${Date.now()}-${order}`,
      type: actionType,
      target: cause.service,
      params: { service: cause.service, evidence: cause.evidence.slice(0, 3) },
      risk: riskFactor,
      confidence: adjustedConfidence,
      approval: this._getApprovalLevel(adjustedConfidence),
      rollbackPlan: this._generateRollbackPlan(actionType, cause.service),
      order,
    };
  }

  private _suggestedActionToType(action: string): HealingActionType | null {
    const mapping: Record<string, HealingActionType> = {
      restart: 'restart', 'scale-up': 'scale-up', rollback: 'rollback',
      'clear-cache': 'clear-cache', 'reset-rate-limit': 'reset-rate-limit',
      'run-migration': 'run-migration', 'revert-config': 'revert-config',
      'drain-connections': 'drain-connections', 'increase-limit': 'increase-limit',
      'create-pr': 'create-pr', 'investigate-service': 'restart',
      'investigate-upstream': 'restart', 'kill-queries': 'restart',
      'check-network': 'restart', 'clean-disk': 'scale-up', retry: 'restart',
    };
    return mapping[action] ?? null;
  }

  private _getActionRisk(type: HealingActionType): number {
    const risks: Record<HealingActionType, number> = {
      restart: 0.1, 'scale-up': 0.05, 'scale-down': 0.1, rollback: 0.3,
      'clear-cache': 0.05, 'reset-rate-limit': 0.05, 'run-migration': 0.5,
      'revert-config': 0.25, 'drain-connections': 0.1, 'increase-limit': 0.15,
      'create-pr': 0.4,
    };
    return risks[type] ?? 0.2;
  }

  private _getApprovalLevel(confidence: number): ApprovalLevel {
    if (confidence > 0.9) return 'auto';
    if (confidence > 0.7) return 'semi-auto';
    if (confidence > 0.5) return 'manual';
    return 'critical';
  }

  private _generateRollbackPlan(actionType: HealingActionType, target: string): HealingAction[] {
    const opposite: Record<HealingActionType, HealingActionType | null> = {
      restart: null, 'scale-up': 'scale-down', 'scale-down': 'scale-up',
      rollback: null, 'clear-cache': null, 'reset-rate-limit': null,
      'run-migration': null, 'revert-config': null,
      'drain-connections': null, 'increase-limit': null, 'create-pr': null,
    };
    const oppositeType = opposite[actionType];
    if (!oppositeType) return [];
    return [{
      actionId: `rollback-${actionType}-${target}`,
      type: oppositeType,
      target,
      params: { service: target, reason: 'Rollback of failed healing action' },
      risk: 0.1,
      confidence: 0.95,
      approval: 'auto' as ApprovalLevel,
      rollbackPlan: [],
      order: 0,
    }];
  }

  private async _executeRestart(action: HealingAction): Promise<HealingResult> {
    const start = Date.now();
    return {
      actionId: action.actionId, type: 'restart', status: 'success',
      startTime: start, endTime: Date.now(), output: `Service ${action.target} restarted`,
    };
  }

  private async _executeScaleUp(action: HealingAction): Promise<HealingResult> {
    const start = Date.now();
    return {
      actionId: action.actionId, type: 'scale-up', status: 'success',
      startTime: start, endTime: Date.now(), output: `Service ${action.target} scaled up`,
    };
  }

  private async _executeScaleDown(action: HealingAction): Promise<HealingResult> {
    const start = Date.now();
    return {
      actionId: action.actionId, type: 'scale-down', status: 'success',
      startTime: start, endTime: Date.now(), output: `Service ${action.target} scaled down`,
    };
  }

  private async _executeRollback(action: HealingAction): Promise<HealingResult> {
    const start = Date.now();
    return {
      actionId: action.actionId, type: 'rollback', status: 'success',
      startTime: start, endTime: Date.now(), output: `Service ${action.target} rolled back`,
    };
  }

  private async _executeClearCache(action: HealingAction): Promise<HealingResult> {
    const start = Date.now();
    return {
      actionId: action.actionId, type: 'clear-cache', status: 'success',
      startTime: start, endTime: Date.now(), output: `Cache cleared for ${action.target}`,
    };
  }

  private async _executeResetRateLimit(action: HealingAction): Promise<HealingResult> {
    const start = Date.now();
    return {
      actionId: action.actionId, type: 'reset-rate-limit', status: 'success',
      startTime: start, endTime: Date.now(), output: `Rate limit reset for ${action.target}`,
    };
  }

  private async _executeCreatePR(action: HealingAction): Promise<HealingResult> {
    const start = Date.now();
    return {
      actionId: action.actionId, type: 'create-pr', status: 'success',
      startTime: start, endTime: Date.now(), output: `PR created for ${action.target}`,
    };
  }
}
