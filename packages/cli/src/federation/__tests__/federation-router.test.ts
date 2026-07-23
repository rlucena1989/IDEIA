import { describe, it, expect } from '@jest/globals';
import { routeSync } from '../federation-router';
import { createContextNode, createSyncRequest, ContextNode } from '../federation-types';

describe('federation-router', () => {
  it('routeSync should be defined', () => {
    expect(routeSync).toBeDefined();
  });

  it('should prefer authority nodes', () => {
    const nodes = [
      createContextNode({ name: 'Local', type: 'local', scope: ['state'], authorityLevel: 'low' }),
      createContextNode({ name: 'Authority', type: 'authority', scope: ['state'], authorityLevel: 'critical' }),
    ];
    const req = createSyncRequest({ fromNodeId: nodes[0].nodeId, toNodeId: '', payloadType: 'state' });
    const target = routeSync(nodes, req);
    expect(target?.name).toBe('Authority');
  });

  it('should ignore unhealthy nodes', () => {
    const nodes = [
      createContextNode({ name: 'Offline', type: 'local', scope: ['state'], status: 'offline' }),
      createContextNode({ name: 'Healthy', type: 'local', scope: ['state'], status: 'healthy' }),
    ];
    const req = createSyncRequest({ fromNodeId: 'x', toNodeId: '', payloadType: 'state' });
    const target = routeSync(nodes, req);
    expect(target?.name).toBe('Healthy');
  });

  it('should return undefined if no candidates', () => {
    const nodes: ContextNode[] = [];
    const req = createSyncRequest({ fromNodeId: 'x', toNodeId: '', payloadType: 'state' });
    expect(routeSync(nodes, req)).toBeUndefined();
  });
});
