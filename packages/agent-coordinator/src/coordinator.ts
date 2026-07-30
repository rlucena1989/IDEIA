import { TaskAgentMatcher } from './matcher';
import { createLogger } from '@ideia/logger';
import { LoadBalancer } from './load-balancer';
import { AgentCapability, TaskProfile, CoordinationResult, AgentHistoryEntry } from './types';
const logger = createLogger('coordinator');

export interface AgentCoordinatorConfig {
  loadBalanceStrategy: 'round-robin' | 'least-loaded' | 'weighted-random';
  maxFallbackAttempts: number;
}

export class AgentCoordinator {
  private agents: Map<string, AgentCapability> = new Map();
  private matcher: TaskAgentMatcher;
  private loadBalancer: LoadBalancer;
  private config: AgentCoordinatorConfig;

  constructor(
    matcher: TaskAgentMatcher,
    loadBalancer: LoadBalancer,
    config?: Partial<AgentCoordinatorConfig>
  ) {
    this.matcher = matcher;
    this.loadBalancer = loadBalancer;
    this.config = {
      loadBalanceStrategy: 'round-robin',
      maxFallbackAttempts: 2,
      ...config,
    };
  }

  registerAgent(capability: AgentCapability): void {
    this.agents.set(capability.agentId, capability);
  }

  unregisterAgent(agentId: string): void {
    this.agents.delete(agentId);
  }

  getAgent(agentId: string): AgentCapability | undefined {
    return this.agents.get(agentId);
  }

  listAgents(): AgentCapability[] {
    return Array.from(this.agents.values());
  }

  async assignTask(task: TaskProfile): Promise<CoordinationResult> {
    const availableAgents = this.listAgents().filter(a => a.currentLoad < a.maxLoad);
    if (availableAgents.length === 0) {
      return {
        taskId: task.taskId,
        assignedAgent: '',
        status: 'failed',
        error: 'No available agents',
      };
    }

    const matches = this.matcher.match(task, availableAgents);

    if (matches.length === 0) {
      return {
        taskId: task.taskId,
        assignedAgent: '',
        status: 'failed',
        error: 'No matching agents found for task',
      };
    }

    const primaryCandidate = this.selectByStrategy(
      matches.filter(m => m.score > 0.3).map(m => this.agents.get(m.agentId))
        .filter((a): a is AgentCapability => a !== undefined)
    );

    if (!primaryCandidate) {
      return {
        taskId: task.taskId,
        assignedAgent: '',
        status: 'failed',
        error: 'No suitable agent found',
      };
    }

    let fallbackAgent: AgentCapability | undefined;
    if (matches.length > 1) {
      const fallbackCandidates = matches
        .filter(m => m.agentId !== primaryCandidate.agentId)
        .map(m => this.agents.get(m.agentId))
        .filter((a): a is AgentCapability => a !== undefined);
      fallbackAgent = this.selectByStrategy(fallbackCandidates) ?? undefined;
    }

    primaryCandidate.currentLoad++;
    this.agents.set(primaryCandidate.agentId, primaryCandidate);

    return {
      taskId: task.taskId,
      assignedAgent: primaryCandidate.agentId,
      fallbackAgent: fallbackAgent?.agentId,
      status: 'assigned',
    };
  }

  completeTask(agentId: string, taskId: string, success: boolean, duration: number): void {
    const agent = this.agents.get(agentId);
    if (!agent) return;

    agent.currentLoad = Math.max(0, agent.currentLoad - 1);

    const entry: AgentHistoryEntry = {
      taskId,
      taskType: '',
      startedAt: new Date().toISOString(),
      completedAt: new Date().toISOString(),
      success,
      duration,
    };
    agent.history.push(entry);

    if (agent.history.length > 100) {
      agent.history = agent.history.slice(-100);
    }

    this.agents.set(agentId, agent);
  }

  private selectByStrategy(candidates: AgentCapability[]): AgentCapability | null {
    if (candidates.length === 0) return null;
    if (candidates.length === 1) return candidates[0];

    switch (this.config.loadBalanceStrategy) {
      case 'least-loaded':
        return this.loadBalancer.selectLeastLoaded(candidates);
      case 'weighted-random':
        return this.loadBalancer.selectWeightedRandom(candidates);
      case 'round-robin':
      default:
        return this.loadBalancer.selectAgent(candidates);
    }
  }
}

export function createAgentCoordinator(
  matcher: TaskAgentMatcher,
  loadBalancer: LoadBalancer,
  config?: Partial<AgentCoordinatorConfig>
): AgentCoordinator {
  return new AgentCoordinator(matcher, loadBalancer, config);
}
