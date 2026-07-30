import { AgentRegistry, AgentRegistration } from './agent-registry';
import { createLogger } from '@ideia/logger';
import type { EventBus } from '@ideia/event-bus';

export interface CoordinationState {
  pipeline: string[];
  completed: string[];
  failed: string[];
  currentIndex: number;
  results: Record<string, unknown>;
  errors: Record<string, string>;
  startedAt: number;
}

export class AgentCoordinator {
  private registry: AgentRegistry;
  private eventBus?: EventBus;
  private state: CoordinationState = {
    pipeline: [],
    completed: [],
    failed: [],
    currentIndex: 0,
    results: {},
    errors: {},
    startedAt: 0,
  };

  constructor(registry: AgentRegistry, eventBus?: EventBus) {
    this.registry = registry;
    this.eventBus = eventBus;
  }

  async executePipeline(
    workflow: string[],
    initialState: Record<string, unknown>
  ): Promise<{ results: Record<string, unknown>; state: CoordinationState }> {
    this.state = {
      pipeline: workflow,
      completed: [],
      failed: [],
      currentIndex: 0,
      results: { ...initialState },
      errors: {},
      startedAt: Date.now(),
    };

    let currentState = { ...initialState };

    for (let i = 0; i < workflow.length; i++) {
      const role = workflow[i];
      this.state.currentIndex = i;

      const agent = this.registry.getAgent(role);
      if (!agent) {
        this.state.failed.push(role);
        this.state.errors[role] = `No agent registered for role: ${role}`;
        continue;
      }

      await this.emitAgentEvent('agent.started', role, { input: currentState });

      try {
        const result = await this.executeAgent(agent, currentState);
        this.state.completed.push(role);
        this.state.results[role] = result;
        currentState = { ...currentState, [role]: result };
        await this.emitAgentEvent('agent.completed', role, { output: result });
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : String(err);
        this.state.failed.push(role);
        this.state.errors[role] = errorMsg;
        await this.emitAgentEvent('agent.failed', role, { error: errorMsg });
      }
    }

    return { results: this.state.results, state: { ...this.state } };
  }

  async executeParallel(
    roles: string[],
    task: string
  ): Promise<Record<string, unknown>> {
    const agents = roles
      .map(r => this.registry.getAgent(r))
      .filter((a): a is AgentRegistration => a !== undefined);

    const tasks = agents.map(agent =>
      this.executeAgent(agent, { task }).then(
        result => ({ role: agent.role, result, error: null }),
        err => ({ role: agent.role, result: null, error: err instanceof Error ? err.message : String(err) })
      )
    );

    const results = await Promise.all(tasks);
    const merged: Record<string, unknown> = {};

    for (const r of results) {
      if (r.error) {
        merged[r.role] = { error: r.error };
      } else {
        merged[r.role] = r.result;
      }
    }

    return merged;
  }

  selectAgentsForTask(
    task: string,
    requiredCapabilities: string[]
  ): AgentRegistration[] {
    const candidates = requiredCapabilities.flatMap(cap =>
      this.registry.findAgentsByCapability(cap)
    );
    const seen = new Set<string>();
    return candidates.filter(a => {
      if (seen.has(a.role)) return false;
      seen.add(a.role);
      return true;
    });
  }

  getCoordinationState(): CoordinationState {
    return { ...this.state };
  }

  reset(): void {
    this.state = {
      pipeline: [],
      completed: [],
      failed: [],
      currentIndex: 0,
      results: {},
      errors: {},
      startedAt: 0,
    };
  }

  private async executeAgent(
    agent: AgentRegistration,
    input: Record<string, unknown>
  ): Promise<unknown> {
    return { role: agent.role, processed: true, input };
  }

  private async emitAgentEvent(
    type: string,
    role: string,
    payload: Record<string, unknown>
  ): Promise<void> {
    if (!this.eventBus) return;
    try {
      await this.eventBus.emit({ type, source: `agent:${role}`, payload });
    } catch (_err) {
      // Log silenciado propositalmente — falha nao bloqueia fluxo
    }
  }
}

export function createAgentCoordinator(
  registry: AgentRegistry,
  eventBus?: EventBus
): AgentCoordinator {
  return new AgentCoordinator(registry, eventBus);
}
