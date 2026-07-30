import { RiskLevel, ApprovalLevel, ApprovalRequirement, ApprovalRequest, Approval } from './types';
import { createLogger } from '@ideia/logger';
import { randomUUID } from 'crypto';

const DEFAULT_REQUIREMENTS: Record<RiskLevel, ApprovalRequirement> = {
  low:      { riskLevel: 'low', requiredApprovals: [], autoApprove: true, requiresJustification: false, maxAutoTokens: 5000 },
  medium:   { riskLevel: 'medium', requiredApprovals: ['supervisor'], autoApprove: false, requiresJustification: false, maxAutoTokens: 2000 },
  high:     { riskLevel: 'high', requiredApprovals: ['supervisor', 'manager'], autoApprove: false, requiresJustification: true, maxAutoTokens: 500 },
  critical: { riskLevel: 'critical', requiredApprovals: ['supervisor', 'manager', 'security'], autoApprove: false, requiresJustification: true, maxAutoTokens: 100 },
};

export class ApprovalMatrix {
  private requirements: Map<RiskLevel, ApprovalRequirement> = new Map(Object.entries(DEFAULT_REQUIREMENTS) as [RiskLevel, ApprovalRequirement][]);

  getRequirement(riskLevel: RiskLevel): ApprovalRequirement {
    return this.requirements.get(riskLevel) ?? this.requirements.get('medium')!;
  }

  createRequest(action: string, riskLevel: RiskLevel, requestedBy: string, justification?: string): ApprovalRequest {
    const approvals = this.getRequirement(riskLevel).requiredApprovals.map(level => ({ level, approved: false }));
    return {
      id: randomUUID(),
      action,
      riskLevel,
      justification,
      requestedBy,
      approvals,
      status: approvals.length === 0 ? 'approved' : 'pending',
      createdAt: new Date().toISOString(),
    };
  }

  approve(request: ApprovalRequest, level: ApprovalLevel, approvedBy: string, reason?: string): ApprovalRequest {
    const approval = request.approvals.find(a => a.level === level);
    if (!approval) return request;

    approval.approved = true;
    approval.approvedBy = approvedBy;
    approval.approvedAt = new Date().toISOString();
    approval.reason = reason;

    if (request.approvals.every(a => a.approved)) {
      request.status = 'approved';
    }

    return { ...request };
  }

  reject(request: ApprovalRequest, level: ApprovalLevel, approvedBy: string, reason: string): ApprovalRequest {
    const approval = request.approvals.find(a => a.level === level);
    if (!approval) return request;
    approval.approved = false;
    approval.approvedBy = approvedBy;
    approval.approvedAt = new Date().toISOString();
    approval.reason = reason;
    request.status = 'rejected';
    return { ...request };
  }

  canAutoApprove(riskLevel: RiskLevel, tokenCount: number): boolean {
    const req = this.getRequirement(riskLevel);
    return req.autoApprove && tokenCount <= req.maxAutoTokens;
  }

  setCustomRequirement(level: RiskLevel, req: Partial<ApprovalRequirement>): void {
    const existing = this.getRequirement(level);
    this.requirements.set(level, { ...existing, ...req });
  }
}
