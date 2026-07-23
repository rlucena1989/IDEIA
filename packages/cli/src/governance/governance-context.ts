export interface GovernanceContext {
  contextId: string;
  risk: 'low' | 'medium' | 'high' | 'critical';
  allowAutoActions: boolean;
  requireApproval: boolean;
  policies: string[];
}

export function buildGovernanceContext(params: {
  contextId: string;
  risk?: GovernanceContext['risk'];
  allowAutoActions?: boolean;
  requireApproval?: boolean;
  policies?: string[];
}): GovernanceContext {
  return {
    contextId: params.contextId,
    risk: params.risk ?? 'low',
    allowAutoActions: params.allowAutoActions ?? true,
    requireApproval: params.requireApproval ?? false,
    policies: params.policies ?? [],
  };
}
