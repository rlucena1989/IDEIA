export interface EcosystemPolicy {
  allowCrossDomainSync: boolean;
  requireAuthorityForSecretAccess: boolean;
  maxDomains: number;
}

export const DEFAULT_ECOSYSTEM_POLICY: EcosystemPolicy = {
  allowCrossDomainSync: true,
  requireAuthorityForSecretAccess: true,
  maxDomains: 50,
};
