export interface FederationPolicy {
  policyId: string;
  allowRemoteWrites: boolean;
  allowCrossContextSync: boolean;
  requireAuthorityForCriticalSync: boolean;
  preferLocalOnConflict: boolean;
}

export const DEFAULT_FEDERATION_POLICY: FederationPolicy = {
  policyId: 'policy-federation-default',
  allowRemoteWrites: false,
  allowCrossContextSync: true,
  requireAuthorityForCriticalSync: true,
  preferLocalOnConflict: true,
};
