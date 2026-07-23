import { describe, it, expect } from '@jest/globals';
import { AgentRegistry } from '../agent-registry';
import { createAgent } from '../agent-types';

describe('agent-registry', () => {
  it('should register and list agents', () => {
    const r = new AgentRegistry();
    r.register(createAgent({ name: 'Test', role: 'planner' }));
    expect(r.list().length).toBe(1);
  });

  it('should update existing on re-register', () => {
    const r = new AgentRegistry();
    const a1 = createAgent({ name: 'Old', role: 'planner' });
    r.register(a1);
    r.register({ ...a1, name: 'New' });
    expect(r.get(a1.agentId)?.name).toBe('New');
  });

  it('should filter by role', () => {
    const r = new AgentRegistry();
    r.register(createAgent({ name: 'P', role: 'planner' }));
    r.register(createAgent({ name: 'G', role: 'generator' }));
    expect(r.filterByRole('planner').length).toBe(1);
    expect(r.filterByRole('generator').length).toBe(1);
  });

  it('should filter by status', () => {
    const r = new AgentRegistry();
    r.register(createAgent({ name: 'A', role: 'planner', status: 'idle' }));
    r.register(createAgent({ name: 'B', role: 'generator', status: 'busy' }));
    expect(r.filterByStatus('idle').length).toBe(1);
  });
});
