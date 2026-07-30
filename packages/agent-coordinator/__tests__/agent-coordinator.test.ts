import { describe, it, expect, beforeEach } from '@jest/globals';
import { AgentCoordinator, createAgentCoordinator } from '../src/coordinator';
import { TaskAgentMatcher, createTaskAgentMatcher } from '../src/matcher';
import { LoadBalancer, createLoadBalancer } from '../src/load-balancer';
import { AgentCapability, TaskProfile } from '../src/types';

describe('agent-coordinator', () => {
  let matcher: TaskAgentMatcher;
  let loadBalancer: LoadBalancer;
  let coordinator: AgentCoordinator;

  beforeEach(() => {
    matcher = createTaskAgentMatcher();
    loadBalancer = createLoadBalancer();
    coordinator = createAgentCoordinator(matcher, loadBalancer);

    const programmer: AgentCapability = {
      agentId: 'prog-1',
      role: 'programmer',
      skills: [
        { name: 'typescript', level: 5, category: 'language' },
        { name: 'react', level: 4, category: 'framework' },
        { name: 'testing', level: 3, category: 'quality' },
      ],
      maxLoad: 3,
      currentLoad: 0,
      history: [],
    };

    const tester: AgentCapability = {
      agentId: 'test-1',
      role: 'tester',
      skills: [
        { name: 'testing', level: 5, category: 'quality' },
        { name: 'typescript', level: 3, category: 'language' },
      ],
      maxLoad: 3,
      currentLoad: 0,
      history: [],
    };

    coordinator.registerAgent(programmer);
    coordinator.registerAgent(tester);
  });

  it('exports all components', () => {
    expect(AgentCoordinator).toBeDefined();
    expect(TaskAgentMatcher).toBeDefined();
    expect(LoadBalancer).toBeDefined();
  });

  it('registers and lists agents', () => {
    const agents = coordinator.listAgents();
    expect(agents).toHaveLength(2);
  });

  it('matches task to best agent by skills', () => {
    const task: TaskProfile = {
      taskId: 'task-1',
      type: 'implementation',
      requiredSkills: ['typescript', 'react'],
      estimatedComplexity: 3,
      priority: 1,
    };

    const result = matcher.findBestMatch(task, coordinator.listAgents());
    expect(result).not.toBeNull();
    expect(result!.agentId).toBe('prog-1');
    expect(result!.score).toBeGreaterThan(0.5);
  });

  it('assigns task to matched agent', async () => {
    const task: TaskProfile = {
      taskId: 'task-2',
      type: 'implementation',
      requiredSkills: ['testing'],
      estimatedComplexity: 2,
      priority: 1,
    };

    const result = await coordinator.assignTask(task);
    expect(result.status).toBe('assigned');
    expect(result.assignedAgent).toBeDefined();
  });

  it('provides fallback agent', async () => {
    const task: TaskProfile = {
      taskId: 'task-3',
      type: 'generic',
      requiredSkills: ['typescript'],
      estimatedComplexity: 1,
      priority: 1,
    };

    const result = await coordinator.assignTask(task);
    expect(result.status).toBe('assigned');
    expect(result.fallbackAgent).toBeDefined();
  });

  it('fails when no agents match', async () => {
    coordinator = createAgentCoordinator(matcher, loadBalancer);
    const task: TaskProfile = {
      taskId: 'task-4',
      type: 'unknown',
      requiredSkills: ['rust', 'embedded'],
      estimatedComplexity: 5,
      priority: 3,
    };

    const result = await coordinator.assignTask(task);
    expect(result.status).toBe('failed');
  });

  it('tracks load after task completion', async () => {
    const task: TaskProfile = {
      taskId: 'task-5',
      type: 'testing',
      requiredSkills: ['testing'],
      estimatedComplexity: 1,
      priority: 1,
    };

    const result = await coordinator.assignTask(task);
    expect(result.status).toBe('assigned');

    const agent = coordinator.getAgent(result.assignedAgent);
    expect(agent).toBeDefined();
    expect(agent!.currentLoad).toBe(1);

    coordinator.completeTask(result.assignedAgent, task.taskId, true, 1000);
    expect(agent!.currentLoad).toBe(0);
    expect(agent!.history).toHaveLength(1);
  });

  it('load balancer selects round-robin', () => {
    const candidates = coordinator.listAgents();
    const first = loadBalancer.selectAgent(candidates);
    const second = loadBalancer.selectAgent(candidates);
    expect(first).not.toBeNull();
    expect(second).not.toBeNull();
  });

  it('load balancer selects least loaded', () => {
    const candidates = coordinator.listAgents();
    candidates[0].currentLoad = 2;
    candidates[1].currentLoad = 0;

    const selected = loadBalancer.selectLeastLoaded(candidates);
    expect(selected).not.toBeNull();
    expect(selected!.agentId).toBe('test-1');
  });
});
