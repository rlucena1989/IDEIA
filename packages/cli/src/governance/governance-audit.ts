import * as crypto from 'node:crypto';
import { createLogger } from '@ideia/logger';
const logger = createLogger('governance-audit');

export interface GovernanceAuditEntry {
  auditId: string;
  policyId?: string;
  action: string;
  contextId: string;
  allowed: boolean;
  requiresApproval: boolean;
  approved?: boolean;
  decidedAt: string;
  reason: string;
}

export function buildGovernanceAudit(entry: Omit<GovernanceAuditEntry, 'auditId'>): GovernanceAuditEntry {
  return {
    auditId: crypto.randomUUID(),
    ...entry,
  };
}
