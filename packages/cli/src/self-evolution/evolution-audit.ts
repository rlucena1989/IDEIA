import * as crypto from 'node:crypto';
import { createLogger } from '@ideia/logger';
import { EvolutionAuditEntry } from './evolution-types';
const logger = createLogger('evolution-audit');

export function createEvolutionAudit(params: {
  planId: string;
  action: string;
  before: string;
  after: string;
  success: boolean;
}): EvolutionAuditEntry {
  return {
    auditId: crypto.randomUUID(),
    planId: params.planId,
    action: params.action,
    before: params.before,
    after: params.after,
    timestamp: new Date().toISOString(),
    success: params.success,
  };
}
