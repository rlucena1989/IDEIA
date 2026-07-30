import { Emitter } from '@ideia/core-contributions';
import { createLogger } from '@ideia/logger';
import { AiAgent, AiRequest, AiResponse, AiTool } from './types';

export class AgentRegistry {
  private agents = new Map<string, AiAgent>();
  private onRegisteredEmitter = new Emitter<AiAgent>();
  private onUnregisteredEmitter = new Emitter<string>();

  get onAgentRegistered() { return this.onRegisteredEmitter.event; }
  get onAgentUnregistered() { return this.onUnregisteredEmitter.event; }

  register(agent: AiAgent): void {
    this.agents.set(agent.id, agent);
    this.onRegisteredEmitter.fire(agent);
  }

  unregister(id: string): void {
    this.agents.delete(id);
    this.onUnregisteredEmitter.fire(id);
  }

  get(id: string): AiAgent | undefined {
    return this.agents.get(id);
  }

  getAll(): AiAgent[] {
    return Array.from(this.agents.values());
  }

  findByCapability(capability: string): AiAgent[] {
    return this.getAll().filter(a => a.capabilities.includes(capability));
  }
}

export class AgentExecutor {
  async execute(agent: AiAgent, request: AiRequest): Promise<AiResponse> {
    return agent.execute(request);
  }
}
