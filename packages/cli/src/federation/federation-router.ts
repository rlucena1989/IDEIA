import { ContextNode, SyncRequest } from './federation-types';
import { createLogger } from '@ideia/logger';
const logger = createLogger('federation-router');

export function routeSync(nodes: ContextNode[], request: SyncRequest): ContextNode | undefined {
  const candidates = nodes.filter(n =>
    n.status === 'healthy' &&
    (n.scope.includes(request.payloadType) || n.type === 'authority')
  );

  return candidates
    .sort((a, b) => {
      if (a.authorityLevel !== b.authorityLevel) {
        const order = { low: 0, medium: 1, high: 2, critical: 3 };
        return order[b.authorityLevel] - order[a.authorityLevel];
      }
      return (b.lastSyncAt ?? '').localeCompare(a.lastSyncAt ?? '');
    })[0];
}
