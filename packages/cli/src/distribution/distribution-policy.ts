export interface DistributionPolicy {
  allowUnsignedPackages: boolean;
  requireValidationBeforeEmit: boolean;
  maxSyncRetries: number;
  defaultTarget: string;
}

export const DEFAULT_DISTRIBUTION_POLICY: DistributionPolicy = {
  allowUnsignedPackages: false,
  requireValidationBeforeEmit: true,
  maxSyncRetries: 3,
  defaultTarget: 'local',
};
