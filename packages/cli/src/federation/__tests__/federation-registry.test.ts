import { describe, it, expect } from '@jest/globals';
import { FederationRegistry } from '../federation-registry';
import { createContextNode } from '../federation-types';

describe('federation-registry', () => {
  it('should register and list nodes', () => {
    const r = new FederationRegistry();
    r.register(createContextNode({ name: 'Node1', type: 'local' }));
    expect(r.list().length).toBe(1);
  });

  it('should update on re-register', () => {
    const r = new FederationRegistry();
    const n = createContextNode({ name: 'Old', type: 'local' });
    r.register(n);
    r.register({ ...n, name: 'New' });
    expect(r.get(n.nodeId)?.name).toBe('New');
  });

  it('should remove nodes', () => {
    const r = new FederationRegistry();
    const n = createContextNode({ name: 'X', type: 'edge' });
    r.register(n);
    r.remove(n.nodeId);
    expect(r.list().length).toBe(0);
  });

  it('should list healthy nodes', () => {
    const r = new FederationRegistry();
    r.register(createContextNode({ name: 'A', type: 'local', status: 'healthy' }));
    r.register(createContextNode({ name: 'B', type: 'remote', status: 'blocked' }));
    expect(r.listHealthy().length).toBe(1);
  });
});
