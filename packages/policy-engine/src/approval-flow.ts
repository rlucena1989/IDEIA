export enum ApprovalLevel {
  Self = 'self',
  Team = 'team',
  Organization = 'organization',
}

export enum ApprovalStatus {
  Pending = 'pending',
  Approved = 'approved',
  Rejected = 'rejected',
  Cancelled = 'cancelled',
}

export interface ApprovalRequest {
  id: string;
  resourceType: string;
  resourceId: string;
  action: string;
  requester: string;
  requiredLevel: ApprovalLevel;
  currentLevel: ApprovalLevel;
  status: ApprovalStatus;
  createdAt: string;
  updatedAt: string;
  approvers: string[];
  approvals: Approval[];
  reason?: string;
  metadata?: Record<string, unknown>;
}

export interface Approval {
  approver: string;
  level: ApprovalLevel;
  status: ApprovalStatus;
  timestamp: string;
  comment?: string;
}

export interface ApprovalFlowConfig {
  levels: ApprovalLevel[];
  levelRequirements: Record<ApprovalLevel, {
    minApprovers: number;
    timeoutMs?: number;
    autoApproveAfter?: number;
  }>;
  escalationRules?: {
    escalateAfterMs: number;
    escalateToLevel: ApprovalLevel;
  };
  staleCheckIntervalMs?: number;
  escalationTimeoutMs?: number;
}

export interface ApprovalCallbacks {
  onEscalate?: (request: ApprovalRequest) => void | Promise<void>;
  onApprove?: (request: ApprovalRequest) => void | Promise<void>;
  onReject?: (request: ApprovalRequest) => void | Promise<void>;
}

export class ApprovalFlow {
  private requests: Map<string, ApprovalRequest> = new Map();
  private config: ApprovalFlowConfig;
  private callbacks: ApprovalCallbacks = {};
  private staleCheckTimer: ReturnType<typeof setInterval> | null = null;

  constructor(config?: Partial<ApprovalFlowConfig>) {
    this.config = {
      levels: [ApprovalLevel.Self, ApprovalLevel.Team, ApprovalLevel.Organization],
      levelRequirements: {
        [ApprovalLevel.Self]: { minApprovers: 1 },
        [ApprovalLevel.Team]: { minApprovers: 2, timeoutMs: 86400000 },
        [ApprovalLevel.Organization]: { minApprovers: 3, timeoutMs: 172800000 },
      },
      escalationRules: {
        escalateAfterMs: 43200000,
        escalateToLevel: ApprovalLevel.Organization,
      },
      staleCheckIntervalMs: 30000,
      escalationTimeoutMs: 300000,
      ...config,
    };
  }

  setCallbacks(callbacks: ApprovalCallbacks): void {
    this.callbacks = callbacks;
  }

  startStaleChecker(): void {
    if (this.staleCheckTimer) return;
    this.staleCheckTimer = setInterval(() => {
      this.processStaleAndEscalation();
    }, this.config.staleCheckIntervalMs ?? 30000);

    if (typeof this.staleCheckTimer === 'object' && this.staleCheckTimer !== null) {
      (this.staleCheckTimer as NodeJS.Timeout).unref();
    }
  }

  stopStaleChecker(): void {
    if (this.staleCheckTimer) {
      clearInterval(this.staleCheckTimer);
      this.staleCheckTimer = null;
    }
  }

  private processStaleAndEscalation(): void {
    const now = Date.now();
    const escalationTimeoutMs = this.config.escalationTimeoutMs ?? 300000;

    for (const request of this.requests.values()) {
      if (request.status !== ApprovalStatus.Pending) continue;

      const created = new Date(request.createdAt).getTime();
      const elapsed = now - created;
      const levelReq = this.config.levelRequirements[request.currentLevel];
      const levelTimeout = levelReq.timeoutMs ?? escalationTimeoutMs;

      if (elapsed > levelTimeout) {
        const escalated = this.config.escalationRules &&
          elapsed > this.config.escalationRules.escalateAfterMs &&
          request.currentLevel !== this.config.escalationRules.escalateToLevel;

        const escalationRules = this.config.escalationRules;
        if (escalated && escalationRules && request.currentLevel !== escalationRules.escalateToLevel) {
          request.currentLevel = escalationRules.escalateToLevel;
          request.updatedAt = new Date().toISOString();
          this.requests.set(request.id, request);
          if (this.callbacks.onEscalate) {
            Promise.resolve(this.callbacks.onEscalate(request)).catch(() => {});
          }
        } else {
          request.status = ApprovalStatus.Rejected;
          request.reason = `Request expired after ${elapsed}ms without approval`;
          request.updatedAt = new Date().toISOString();
          this.requests.set(request.id, request);
          if (this.callbacks.onReject) {
            Promise.resolve(this.callbacks.onReject(request)).catch(() => {});
          }
        }
      }
    }
  }

  createRequest(
    resourceType: string,
    resourceId: string,
    action: string,
    requester: string,
    requiredLevel: ApprovalLevel,
    approvers: string[],
    metadata?: Record<string, unknown>
  ): ApprovalRequest {
    const request: ApprovalRequest = {
      id: this.generateId(),
      resourceType,
      resourceId,
      action,
      requester,
      requiredLevel,
      currentLevel: ApprovalLevel.Self,
      status: ApprovalStatus.Pending,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      approvers,
      approvals: [],
      metadata,
    };

    this.requests.set(request.id, request);
    return request;
  }

  approve(requestId: string, approver: string, comment?: string): ApprovalRequest | null {
    const request = this.requests.get(requestId);
    if (!request) return null;

    if (!request.approvers.includes(approver)) {
      throw new Error(`Approver ${approver} is not authorized for this request`);
    }

    const existingApproval = request.approvals.find(a => a.approver === approver);
    if (existingApproval) {
      throw new Error(`Approver ${approver} has already approved this request`);
    }

    request.approvals.push({
      approver,
      level: request.currentLevel,
      status: ApprovalStatus.Approved,
      timestamp: new Date().toISOString(),
      comment,
    });

    request.updatedAt = new Date().toISOString();

    const levelReq = this.config.levelRequirements[request.currentLevel];
    const levelApprovals = request.approvals.filter(a => a.level === request.currentLevel && a.status === ApprovalStatus.Approved);

    if (levelApprovals.length >= levelReq.minApprovers) {
      if (request.currentLevel === request.requiredLevel) {
        request.status = ApprovalStatus.Approved;
      } else {
        request.currentLevel = this.getNextLevel(request.currentLevel);
      }
    }

    this.requests.set(requestId, request);

    if (request.status === ApprovalStatus.Approved && this.callbacks.onApprove) {
      Promise.resolve(this.callbacks.onApprove(request)).catch(() => {});
    }

    return request;
  }

  reject(requestId: string, approver: string, reason: string): ApprovalRequest | null {
    const request = this.requests.get(requestId);
    if (!request) return null;

    if (!request.approvers.includes(approver)) {
      throw new Error(`Approver ${approver} is not authorized for this request`);
    }

    request.approvals.push({
      approver,
      level: request.currentLevel,
      status: ApprovalStatus.Rejected,
      timestamp: new Date().toISOString(),
      comment: reason,
    });

    request.status = ApprovalStatus.Rejected;
    request.reason = reason;
    request.updatedAt = new Date().toISOString();

    this.requests.set(requestId, request);

    if (this.callbacks.onReject) {
      Promise.resolve(this.callbacks.onReject(request)).catch(() => {});
    }

    return request;
  }

  cancel(requestId: string, requester: string): ApprovalRequest | null {
    const request = this.requests.get(requestId);
    if (!request) return null;

    if (request.requester !== requester) {
      throw new Error(`Only the requester can cancel this request`);
    }

    request.status = ApprovalStatus.Cancelled;
    request.updatedAt = new Date().toISOString();

    this.requests.set(requestId, request);
    return request;
  }

  getRequest(requestId: string): ApprovalRequest | null {
    return this.requests.get(requestId) || null;
  }

  getPendingRequests(level?: ApprovalLevel): ApprovalRequest[] {
    const pending = Array.from(this.requests.values()).filter(r => r.status === ApprovalStatus.Pending);
    if (level) {
      return pending.filter(r => r.currentLevel === level);
    }
    return pending;
  }

  getRequestHistory(requester?: string): ApprovalRequest[] {
    const history = Array.from(this.requests.values());
    if (requester) {
      return history.filter(r => r.requester === requester);
    }
    return history.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  escalateStaleRequests(): ApprovalRequest[] {
    const escalated: ApprovalRequest[] = [];
    const now = Date.now();

    if (!this.config.escalationRules) return escalated;

    for (const request of this.requests.values()) {
      if (request.status !== ApprovalStatus.Pending) continue;

      const created = new Date(request.createdAt).getTime();
      const elapsed = now - created;

      if (elapsed > this.config.escalationRules.escalateAfterMs) {
        if (request.currentLevel !== this.config.escalationRules.escalateToLevel) {
          request.currentLevel = this.config.escalationRules.escalateToLevel;
          request.updatedAt = new Date().toISOString();
          this.requests.set(request.id, request);
          escalated.push(request);
        }
      }
    }

    return escalated;
  }

  private getNextLevel(current: ApprovalLevel): ApprovalLevel {
    const levels = this.config.levels;
    const currentIndex = levels.indexOf(current);
    if (currentIndex < levels.length - 1) {
      return levels[currentIndex + 1];
    }
    return current;
  }

  private generateId(): string {
    return `apr-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  updateConfig(config: Partial<ApprovalFlowConfig>): void {
    this.config = { ...this.config, ...config };
  }

  getConfig(): ApprovalFlowConfig {
    return { ...this.config };
  }
}

export function createApprovalFlow(config?: Partial<ApprovalFlowConfig>): ApprovalFlow {
  return new ApprovalFlow(config);
}
