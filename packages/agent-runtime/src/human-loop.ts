export type CriticalityLevel = 'low' | 'medium' | 'high' | 'critical';

export interface ActionRequiringApproval {
  id: string;
  type: string;
  description: string;
  criticality: CriticalityLevel;
  agentId: string;
  timestamp: number;
  payload: unknown;
  status: 'pending' | 'approved' | 'rejected' | 'timeout';
  requiredRole?: 'dev' | 'tech-lead' | 'security';
}

export interface ApprovalResult {
  actionId: string;
  approved: boolean;
  approvedBy?: string;
  reason?: string;
  timestamp: number;
}

const CRITICALITY_ROLES: Record<CriticalityLevel, 'dev' | 'tech-lead' | 'security'> = {
  low: 'dev',
  medium: 'dev',
  high: 'tech-lead',
  critical: 'security',
};

export class HumanInTheLoop {
  private pendingApprovals = new Map<string, ActionRequiringApproval>();
  private completedApprovals = new Map<string, ApprovalResult>();
  private nextId = 1;

  private timeoutMs: number;

  constructor(timeoutMs?: number) {
    this.timeoutMs = timeoutMs ?? 300_000;
  }

  requestApproval(
    type: string,
    description: string,
    criticality: CriticalityLevel,
    agentId: string,
    payload?: unknown,
  ): ActionRequiringApproval {
    const id = `approval-${this.nextId++}-${Date.now()}`;
    const action: ActionRequiringApproval = {
      id,
      type,
      description,
      criticality,
      agentId,
      timestamp: Date.now(),
      payload,
      status: 'pending',
      requiredRole: CRITICALITY_ROLES[criticality],
    };

    this.pendingApprovals.set(id, action);

    if (this.timeoutMs > 0) {
      setTimeout(() => {
        const pending = this.pendingApprovals.get(id);
        if (pending && pending.status === 'pending') {
          pending.status = 'timeout';
          this.completedApprovals.set(id, {
            actionId: id,
            approved: false,
            reason: 'Timeout de aprovação',
            timestamp: Date.now(),
          });
          this.pendingApprovals.delete(id);
        }
      }, this.timeoutMs);
    }

    return action;
  }

  approve(actionId: string, approvedBy?: string, reason?: string): ApprovalResult | undefined {
    const action = this.pendingApprovals.get(actionId);
    if (!action) return undefined;

    action.status = 'approved';
    const result: ApprovalResult = {
      actionId,
      approved: true,
      approvedBy: approvedBy ?? 'auto',
      reason,
      timestamp: Date.now(),
    };

    this.completedApprovals.set(actionId, result);
    this.pendingApprovals.delete(actionId);
    return result;
  }

  reject(actionId: string, reason: string, rejectedBy?: string): ApprovalResult | undefined {
    const action = this.pendingApprovals.get(actionId);
    if (!action) return undefined;

    action.status = 'rejected';
    const result: ApprovalResult = {
      actionId,
      approved: false,
      approvedBy: rejectedBy ?? 'auto',
      reason,
      timestamp: Date.now(),
    };

    this.completedApprovals.set(actionId, result);
    this.pendingApprovals.delete(actionId);
    return result;
  }

  getPendingApprovals(): ActionRequiringApproval[] {
    return Array.from(this.pendingApprovals.values());
  }

  getPendingByRole(role: 'dev' | 'tech-lead' | 'security'): ActionRequiringApproval[] {
    return this.getPendingApprovals().filter(a => a.requiredRole === role);
  }

  getCompletedApprovals(limit?: number): ApprovalResult[] {
    const all = Array.from(this.completedApprovals.values());
    return limit ? all.slice(-limit) : all;
  }

  getStatus(actionId: string): 'pending' | 'approved' | 'rejected' | 'timeout' | 'not_found' {
    const pending = this.pendingApprovals.get(actionId);
    if (pending) return pending.status;
    const completed = this.completedApprovals.get(actionId);
    if (completed) return completed.approved ? 'approved' : 'rejected';
    return 'not_found';
  }

  isCriticalAction(type: string): boolean {
    const criticalTypes = [
      'deploy.production',
      'policy.modify',
      'data.delete',
      'config.global',
      'user.impersonate',
      'security.override',
      'audit.clear',
    ];
    return criticalTypes.includes(type);
  }

  clearCompleted(): void {
    this.completedApprovals.clear();
  }
}

export function createHumanInTheLoop(timeoutMs?: number): HumanInTheLoop {
  return new HumanInTheLoop(timeoutMs);
}
