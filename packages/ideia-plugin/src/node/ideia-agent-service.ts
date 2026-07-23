import { injectable, inject } from '@theia/core/shared/inversify';
import { v4 as uuid } from 'uuid';
import { EventBus } from '@ideia/event-bus';
import { IDEIA_AgentService } from '../common/ideia-protocol';
import { AgentInfo } from '../common/ideia-types';

@injectable()
export class IDEIA_AgentBackendService implements IDEIA_AgentService {
  private agents = new Map<string, AgentInfo>();

  constructor(
    @inject(EventBus) private eventBus: EventBus,
  ) {
    this.registerBuiltInAgents();
  }

  private registerBuiltInAgents(): void {
    const builtIn: AgentInfo[] = [
      {
        id: 'ideia-architect',
        name: 'IDEIA Architect',
        description: 'Designs system architecture from natural language requirements',
        status: 'idle',
        metrics: { totalTasks: 0, completedTasks: 0, failedTasks: 0, averageLatencyMs: 0, tokensUsed: 0 },
      },
      {
        id: 'ideia-coder',
        name: 'IDEIA Coder',
        description: 'Implements features and writes production-grade code',
        status: 'idle',
        metrics: { totalTasks: 0, completedTasks: 0, failedTasks: 0, averageLatencyMs: 0, tokensUsed: 0 },
      },
      {
        id: 'ideia-reviewer',
        name: 'IDEIA Reviewer',
        description: 'Reviews code for quality, security, and correctness',
        status: 'idle',
        metrics: { totalTasks: 0, completedTasks: 0, failedTasks: 0, averageLatencyMs: 0, tokensUsed: 0 },
      },
      {
        id: 'ideia-tester',
        name: 'IDEIA Tester',
        description: 'Generates and runs tests for the codebase',
        status: 'idle',
        metrics: { totalTasks: 0, completedTasks: 0, failedTasks: 0, averageLatencyMs: 0, tokensUsed: 0 },
      },
      {
        id: 'ideia-devops',
        name: 'IDEIA DevOps',
        description: 'Manages deployment, CI/CD, and infrastructure',
        status: 'idle',
        metrics: { totalTasks: 0, completedTasks: 0, failedTasks: 0, averageLatencyMs: 0, tokensUsed: 0 },
      },
    ];

    for (const agent of builtIn) {
      this.agents.set(agent.id, agent);
    }
  }

  async getAgents(): Promise<AgentInfo[]> {
    return Array.from(this.agents.values());
  }

  async getAgent(id: string): Promise<AgentInfo | undefined> {
    return this.agents.get(id);
  }

  async runAgent(agentId: string, _input: string): Promise<string> {
    const agent = this.agents.get(agentId);
    if (!agent) throw new Error(`Agent not found: ${agentId}`);

    const taskId = uuid();
    agent.status = 'running';
    agent.currentTask = taskId;

    if (agent.metrics) {
      agent.metrics.totalTasks++;
    }

    await this.eventBus.emit({
      type: 'agent.started',
      source: 'ideia-agent',
      payload: { agent: { id: agentId }, task: { id: taskId } },
    });

    return taskId;
  }

  async stopAgent(agentId: string): Promise<void> {
    const agent = this.agents.get(agentId);
    if (agent) {
      agent.status = 'idle';
      agent.currentTask = undefined;

      await this.eventBus.emit({
        type: 'agent.completed',
        source: 'ideia-agent',
        payload: { agent: { id: agentId } },
      });
    }
  }

  async getAgentMetrics(id: string): Promise<AgentInfo['metrics'] | undefined> {
    return this.agents.get(id)?.metrics;
  }

  recordTaskCompletion(agentId: string, success: boolean, latencyMs: number, tokensUsed: number): void {
    const agent = this.agents.get(agentId);
    if (agent && agent.metrics) {
      if (success) agent.metrics.completedTasks++;
      else agent.metrics.failedTasks++;

      const prev = agent.metrics.averageLatencyMs;
      const n = agent.metrics.totalTasks;
      agent.metrics.averageLatencyMs = prev + (latencyMs - prev) / n;
      agent.metrics.tokensUsed += tokensUsed;

      agent.status = 'idle';
    }
  }
}
