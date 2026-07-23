export interface EvolutionAuditEntry {
  auditId: string;
  requestId: string;
  command: string;
  action: string;
  rationale: string;
  createdAt: string;
  result: 'ok' | 'warning' | 'blocked' | 'failed';
  notes: string[];
}

export interface EvolutionAuditTrail {
  generatedAt: string;
  entries: EvolutionAuditEntry[];
}
