import { describe, it, expect } from '@jest/globals';
import { coordinateTasks } from '../agent-coordinator';
import { createAgent, createTask, OperationalAgent } from '../agent-types';

describe('agent-coordinator', () => {
  it('coordinateTasks should be defined', () => {
    expect(coordinateTasks).toBeDefined();
  });

  it('should assign tasks to capable agents', () => {
    const agent = createAgent({ name: 'Gen', role: 'generator', capabilities: ['generate'] });
    const task = createTask({ agentId: agent.agentId, type: 'generate' });
    const { assigned, rejected } = coordinateTasks([agent], [task]);
    expect(assigned.length).toBe(1);
    expect(rejected.length).toBe(0);
  });

  it('should reject tasks for incapable agents', () => {
    const agent = createAgent({ name: 'Gen', role: 'generator', capabilities: ['generate'] });
    const task = createTask({ agentId: agent.agentId, type: 'sync' });
    const { assigned, rejected } = coordinateTasks([agent], [task]);
    expect(assigned.length).toBe(0);
    expect(rejected.length).toBe(1);
  });

  it('should reject tasks for blocked agents', () => {
    const agent = createAgent({ name: 'Blocked', role: 'planner', status: 'blocked', capabilities: ['plan'] });
    const task = createTask({ agentId: agent.agentId, type: 'plan' });
    const { assigned, rejected } = coordinateTasks([agent], [task]);
    expect(assigned.length).toBe(0);
    expect(rejected.length).toBe(1);
  });

  it('should produce results for all tasks', () => {
    const agent = createAgent({ name: 'A', role: 'planner', capabilities: ['plan'] });
    const tasks = [createTask({ agentId: agent.agentId, type: 'plan' })];
    const { results } = coordinateTasks([agent], tasks);
    expect(results.length).toBe(1);
    expect(results[0].ok).toBe(true);
  });
});
