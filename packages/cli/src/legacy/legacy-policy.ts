export interface LegacyPolicy {
  policyId: string;
  allowStructuralChanges: boolean;
  allowCriticalFixes: boolean;
  requireGovernanceApproval: boolean;
  maxMaintenanceWindowDays: number;
}

export const DEFAULT_LEGACY_POLICY: LegacyPolicy = {
  policyId: 'policy-legacy-default',
  allowStructuralChanges: false,
  allowCriticalFixes: true,
  requireGovernanceApproval: true,
  maxMaintenanceWindowDays: 30,
};
