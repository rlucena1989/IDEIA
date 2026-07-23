export interface EvolutionChange {
  changeId: string;
  type: 'enable' | 'disable' | 'replace' | 'tune' | 'migrate';
  target: string;
  from?: string | number | boolean;
  to?: string | number | boolean;
  reason: string;
}

export interface EvolutionPlan {
  planId: string;
  createdAt: string;
  changes: EvolutionChange[];
  requiresApproval: boolean;
  rollbackAvailable: boolean;
}

export interface EvolutionResult {
  planId: string;
  applied: boolean;
  appliedAt: string;
  notes: string[];
}

export interface EvolutionAuditEntry {
  auditId: string;
  planId: string;
  action: string;
  before: string;
  after: string;
  timestamp: string;
  success: boolean;
}
