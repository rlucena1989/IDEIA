export interface AuditEntry {
  auditId: string;
  subject: string;
  action: string;
  outcome: string;
  timestamp: string;
}

export function auditEcosystem(subject: string, action: string, outcome: string): AuditEntry {
  return {
    auditId: `audit-${Date.now()}`,
    subject,
    action,
    outcome,
    timestamp: new Date().toISOString(),
  };
}
