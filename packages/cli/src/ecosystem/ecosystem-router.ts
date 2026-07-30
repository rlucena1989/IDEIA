import { DomainNode } from './ecosystem-types';
import { createLogger } from '@ideia/logger';
const logger = createLogger('ecosystem-router');

export function routeEcosystemSync(
  from: DomainNode,
  domains: DomainNode[],
  payloadType: string
): DomainNode | undefined {
  return domains.find(d =>
    d.domainId !== from.domainId &&
    d.status === 'healthy' &&
    d.scope.includes(payloadType)
  );
}
