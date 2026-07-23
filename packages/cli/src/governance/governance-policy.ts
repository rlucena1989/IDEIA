import { GovernancePolicy } from './policy-types';

export const DEFAULT_GOVERNANCE_POLICY: GovernancePolicy = {
  policyId: 'policy-default-governance',
  name: 'Default Governance Policy',
  description: 'Baseline operational governance rules.',
  enabled: true,
  appliesTo: ['state', 'generation', 'hardening', 'distribution', 'telemetry', 'resilience', 'evolution'],
  rules: [
    {
      ruleId: 'rule-block-critical-generation',
      action: 'generate',
      allow: true,
      requiresApproval: true,
      minRisk: 'high',
    },
    {
      ruleId: 'rule-block-forced-sync-critical',
      action: 'sync',
      allow: true,
      requiresApproval: true,
      minRisk: 'high',
    },
    {
      ruleId: 'rule-deny-unaudited-publish',
      action: 'publish',
      allow: false,
      requiresApproval: true,
      minRisk: 'medium',
    },
  ],
};
