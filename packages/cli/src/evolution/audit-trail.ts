import * as crypto from 'node:crypto';
import { EvolutionAuditEntry, EvolutionAuditTrail } from './audit-types';

export function buildAuditTrail(entries: EvolutionAuditEntry[]): EvolutionAuditTrail {
  return {
    generatedAt: new Date().toISOString(),
    entries,
  };
}

export function createAuditEntry(params: {
  command: string;
  action: string;
  rationale: string;
  requestId: string;
  result: EvolutionAuditEntry['result'];
  notes?: string[];
}): EvolutionAuditEntry {
  return {
    auditId: crypto.randomUUID(),
    requestId: params.requestId,
    command: params.command,
    action: params.action,
    rationale: params.rationale,
    createdAt: new Date().toISOString(),
    result: params.result,
    notes: params.notes ?? [],
  };
}
