import * as crypto from 'node:crypto';
import type { ApprovalRequest, ApprovalResult } from '@ideia/contracts';

export type { ApprovalRequest, ApprovalResult };

export type ApprovalLevel = 'dev' | 'tech-lead' | 'security';
export type ApprovalDecision = 'pending' | 'approved' | 'rejected' | 'escalated' | 'expired';

export interface MultiLevelRequest extends ApprovalRequest {
  requiredLevel: ApprovalLevel;
  currentLevel: ApprovalLevel;
  deadlineMs: number;
  createdAt: number;
  escalatedFrom?: ApprovalLevel;
}

export interface MultiLevelResult extends ApprovalResult {
  level: ApprovalLevel;
  decision: ApprovalDecision;
  escalatedTo?: ApprovalLevel;
}

const LEVEL_HIERARCHY: ApprovalLevel[] = ['dev', 'tech-lead', 'security'];
const DEADLINE_DEFAULT_MS = 5 * 60 * 1000; // 5 minutes per level

export function createApprovalRequest(params: {
  action: string;
  requestedBy: string;
  reason: string;
  level?: ApprovalLevel;
  deadlineMs?: number;
}): MultiLevelRequest {
  return {
    approvalId: crypto.randomUUID(),
    action: params.action,
    requestedBy: params.requestedBy,
    requestedAt: new Date().toISOString(),
    reason: params.reason,
    status: 'pending',
    requiredLevel: params.level || 'dev',
    currentLevel: 'dev',
    deadlineMs: params.deadlineMs || DEADLINE_DEFAULT_MS,
    createdAt: Date.now(),
  };
}

export function approveAction(
  request: MultiLevelRequest,
  approved: boolean,
  approver?: string,
): MultiLevelResult {
  const currentIdx = LEVEL_HIERARCHY.indexOf(request.currentLevel);
  const requiredIdx = LEVEL_HIERARCHY.indexOf(request.requiredLevel);

  if (Date.now() - request.createdAt > request.deadlineMs) {
    if (requiredIdx > currentIdx) {
      const nextLevel = LEVEL_HIERARCHY[currentIdx + 1];
      return {
        approved: false,
        decidedAt: new Date().toISOString(),
        note: `Deadline expired at ${request.currentLevel} level. Escalated to ${nextLevel}.`,
        level: request.currentLevel,
        decision: 'escalated' as ApprovalDecision,
        escalatedTo: nextLevel,
      };
    }
    return {
      approved: false,
      decidedAt: new Date().toISOString(),
      note: 'Deadline expired. Action auto-rejected.',
      level: request.currentLevel,
      decision: 'expired' as ApprovalDecision,
    };
  }

  if (approved && requiredIdx > currentIdx) {
    // Approved at current level but needs higher approval
    const nextLevel = LEVEL_HIERARCHY[currentIdx + 1];
    return {
      approved: false,
      decidedAt: new Date().toISOString(),
      note: `Approved at ${request.currentLevel} level. Escalated to ${nextLevel} for final approval.`,
      approvedBy: approver,
      level: request.currentLevel,
      decision: 'escalated' as ApprovalDecision,
      escalatedTo: nextLevel,
    };
  }

  const finalApproved = approved && currentIdx >= requiredIdx;
  return {
    approved: finalApproved,
    approvedBy: finalApproved ? approver : undefined,
    decidedAt: new Date().toISOString(),
    note: finalApproved ? `Action approved at ${request.currentLevel} level.` : `Action rejected at ${request.currentLevel} level.`,
    level: request.currentLevel,
    decision: (finalApproved ? 'approved' : 'rejected') as ApprovalDecision,
  };
}

export function escalateRequest(request: MultiLevelRequest): MultiLevelResult | null {
  const currentIdx = LEVEL_HIERARCHY.indexOf(request.currentLevel);
  const requiredIdx = LEVEL_HIERARCHY.indexOf(request.requiredLevel);

  if (requiredIdx <= currentIdx) return null;

  const nextLevel = LEVEL_HIERARCHY[currentIdx + 1];
  return {
    approved: false,
    decidedAt: new Date().toISOString(),
    note: `Escalated from ${request.currentLevel} to ${nextLevel}.`,
    level: request.currentLevel,
    decision: 'escalated' as ApprovalDecision,
    escalatedTo: nextLevel,
  };
}
