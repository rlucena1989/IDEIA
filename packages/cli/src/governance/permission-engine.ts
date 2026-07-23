import { GovernancePolicy } from './policy-types';

export interface PermissionRequest {
  action: string;
  contextId: string;
  risk: 'low' | 'medium' | 'high' | 'critical';
}

export interface PermissionResult {
  allowed: boolean;
  requiresApproval: boolean;
  reason: string;
  policyId?: string;
}

export function evaluatePermission(
  request: PermissionRequest,
  policies: GovernancePolicy[]
): PermissionResult {
  for (const policy of policies) {
    if (!policy.enabled) continue;

    for (const rule of policy.rules) {
      const matchesAction = rule.action === request.action;
      const matchesContext = !rule.contexts || rule.contexts.includes(request.contextId);
      const matchesRisk =
        !rule.minRisk ||
        (request.risk === rule.minRisk ||
          (request.risk === 'critical' && rule.minRisk !== 'low'));

      if (matchesAction && matchesContext && matchesRisk) {
        return {
          allowed: rule.allow,
          requiresApproval: rule.requiresApproval,
          reason: rule.allow ? 'Allowed by policy' : 'Denied by policy',
          policyId: policy.policyId,
        };
      }
    }
  }

  return {
    allowed: true,
    requiresApproval: false,
    reason: 'No matching policy rule — allowed by default.',
  };
}
