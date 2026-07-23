export interface GovernancePolicy {
  policyId: string;
  name: string;
  description: string;
  enabled: boolean;
  appliesTo: Array<'state' | 'generation' | 'hardening' | 'distribution' | 'telemetry' | 'resilience' | 'evolution'>;
  rules: GovernanceRule[];
}

export interface GovernanceRule {
  ruleId: string;
  action: string;
  allow: boolean;
  requiresApproval: boolean;
  minRisk?: 'low' | 'medium' | 'high' | 'critical';
  contexts?: string[];
}
