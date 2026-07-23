import { AuthorityAssignment, DomainNode } from './ecosystem-types';

export function grantAuthority(
  domain: DomainNode,
  grantedBy: string,
  reason: string
): AuthorityAssignment {
  return {
    assignmentId: `assignment-${Date.now()}`,
    domainId: domain.domainId,
    authorityLevel: domain.trustLevel === 'critical' ? 'critical' : 'high',
    grantedAt: new Date().toISOString(),
    grantedBy,
    reason,
  };
}
