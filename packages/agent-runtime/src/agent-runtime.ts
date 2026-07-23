import { Decision, RiskLevel } from '@ideia/contracts';
import { evaluatePolicy, PolicyResult } from '@ideia/policy-engine';
import { AuditTrail } from '@ideia/audit-trail';
import { MemoryStore } from '@ideia/memory-store';

export interface AgentRequest {
  message: string;
  actionType: string;
  resource?: string;
  riskLevel?: RiskLevel;
  metadata?: Record<string, unknown>;
}

export interface ExecutableStep {
  type: 'interpret' | 'evaluate' | 'execute' | 'log' | 'update_memory' | 'request_approval' | 'wait_approval' | 'notify' | 'tool_call';
  description: string;
  handler?: string;
  params?: Record<string, unknown>;
}

export interface AgentPlan {
  steps: ExecutableStep[];
  decision: Decision;
  reason: string;
  actionId: string;
}

export interface StepExecutor {
  execute(step: ExecutableStep): Promise<unknown>;
}

export class AgentRuntime {
  private _lastSessionId: string | null = null;
  private executor?: StepExecutor;

  constructor(
    private auditTrail: AuditTrail,
    private memoryStore: MemoryStore,
    executor?: StepExecutor,
  ) {
    this.executor = executor;
  }

  setExecutor(executor: StepExecutor): void {
    this.executor = executor;
  }

  getMemoryStore(): MemoryStore {
    return this.memoryStore;
  }

  run(request: AgentRequest): AgentPlan {
    try {
      const memory = this.memoryStore.load();
      if (memory.sessionId && !this._lastSessionId) {
        this._lastSessionId = memory.sessionId;
      } else if (this._lastSessionId && memory.sessionId !== this._lastSessionId) {
        memory.sessionId = this._lastSessionId;
      }
      const policy = evaluatePolicy({
        actionType: request.actionType,
        resource: request.resource,
        riskLevel: request.riskLevel,
      });

      const actionId = `action_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      const steps = this.buildPlan(request, policy);

      if (policy.decision !== 'ask') {
        this.auditTrail.append({
          actor: 'ai',
          eventType: 'agent.run',
          target: request.actionType,
          decision: policy.decision,
          result: 'pending',
          metadata: {
            actionId,
            message: request.message,
            resource: request.resource,
            policyReason: policy.reason,
          },
        });
      }

      this.memoryStore.pushDecision(memory, {
        actionId,
        actionType: request.actionType,
        decision: policy.decision,
        timestamp: new Date().toISOString(),
      });

      return { steps, decision: policy.decision, reason: policy.reason, actionId };
    } catch (err) {
      const errorActionId = `action_error_${Date.now()}`;
      const errMsg = err instanceof Error ? err.message : String(err);
      this.auditTrail.append({
        actor: 'ai',
        eventType: 'agent.run.error',
        target: request.actionType,
        decision: 'rejected',
        result: 'failure',
        metadata: { error: errMsg, message: request.message },
      });
      return {
        steps: [],
        decision: 'block',
        reason: `runtime error: ${errMsg}`,
        actionId: errorActionId,
      };
    }
  }

  async executePlan(plan: AgentPlan): Promise<{ success: boolean; results: unknown[] }> {
    if (!this.executor) {
      return { success: false, results: [new Error('No StepExecutor configured')] };
    }
    const results: unknown[] = [];
    for (const step of plan.steps) {
      try {
        const result = await this.executor.execute(step);
        results.push(result);
      } catch (err) {
        const errMsg = err instanceof Error ? err.message : String(err);
        this.auditTrail.append({
          actor: 'ai',
          eventType: 'agent.step.error',
          target: step.type,
          decision: 'rejected',
          result: 'failure',
          metadata: { step: step.type, error: errMsg, planId: plan.actionId },
        });
        return { success: false, results };
      }
    }
    return { success: true, results };
  }

  private buildPlan(request: AgentRequest, policy: PolicyResult): ExecutableStep[] {
    const plan: ExecutableStep[] = [
      { type: 'interpret', description: `interpret message: ${request.message}`, params: { message: request.message } },
      { type: 'evaluate', description: `evaluate action: ${request.actionType}`, params: { actionType: request.actionType } },
    ];

    if (policy.decision === 'auto') {
      plan.push({ type: 'execute', description: `execute: ${request.actionType}`, handler: request.actionType, params: { resource: request.resource, riskLevel: request.riskLevel } });
      plan.push({ type: 'log', description: 'log result to audit trail', handler: 'audit_trail', params: { actionType: request.actionType, decision: policy.decision } });
      plan.push({ type: 'update_memory', description: 'update memory context', handler: 'memory_store', params: { actionType: request.actionType } });
    } else if (policy.decision === 'ask') {
      plan.push({ type: 'request_approval', description: 'create approval request', handler: 'approval_flow', params: { actionType: request.actionType, reason: policy.reason } });
      plan.push({ type: 'wait_approval', description: 'wait for human decision', handler: 'approval_flow' });
      plan.push({ type: 'execute', description: 'execute or discard based on approval', handler: request.actionType, params: { resource: request.resource, conditional: true } });
    } else {
      plan.push({ type: 'notify', description: 'action blocked — notify user', handler: 'notification', params: { reason: policy.reason } });
    }

    return plan;
  }

  start(): void {
    // lifecycle hook — subclasses can override
  }

  stop(): void {
    // lifecycle hook — subclasses can override
  }

  pause(): void {
    // lifecycle hook — subclasses can override
  }

  resume(): void {
    // lifecycle hook — subclasses can override
  }

  confirmExecution(actionId: string, approved: boolean, reason?: string): void {
    if (!actionId || actionId.length === 0) {
      this.auditTrail.append({
        actor: 'user',
        eventType: 'agent.confirm.error',
        target: 'unknown',
        decision: 'rejected',
        result: 'failure',
        metadata: { error: 'invalid actionId' },
      });
      return;
    }
    const memory = this.memoryStore.load();
    this.auditTrail.append({
      actor: 'user',
      eventType: 'agent.confirm',
      target: actionId,
      decision: approved ? 'approved' : 'rejected',
      result: approved ? 'success' : 'failure',
      metadata: { reason },
    });
    this.memoryStore.pushDecision(memory, {
      actionId,
      approved,
      reason,
      resolvedAt: new Date().toISOString(),
    });
  }
}
