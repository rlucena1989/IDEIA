import { DomainNode } from './ecosystem-types';

export function canCrossTrustBoundary(
  from: DomainNode,
  to: DomainNode,
  payloadType: string
): boolean {
  if (from.trustLevel === 'low' && to.trustLevel === 'critical') return false;
  if (payloadType === 'secret') return false;
  if (payloadType === 'policy' && to.status !== 'blocked') return true;
  return from.status === 'healthy' && to.status === 'healthy';
}
