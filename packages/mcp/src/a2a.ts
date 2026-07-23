export type AgentCardStatus = 'active' | 'idle' | 'busy' | 'error';

export interface AgentCard {
  agentId: string;
  name: string;
  description: string;
  version: string;
  capabilities: string[];
  status: AgentCardStatus;
  skills: AgentSkill[];
}

export interface AgentSkill {
  id: string;
  name: string;
  description: string;
  inputType: string;
  outputType: string;
}

export interface A2AMessage {
  id: string;
  from: string;
  to: string;
  type: 'request' | 'response' | 'error';
  skill: string;
  payload: Record<string, unknown>;
  timestamp: string;
  correlationId?: string;
}

export interface A2ATask {
  id: string;
  agentId: string;
  skill: string;
  input: Record<string, unknown>;
  status: 'pending' | 'running' | 'completed' | 'failed';
  output?: unknown;
  error?: string;
  createdAt: string;
  completedAt?: string;
}

export class A2AProtocol {
  private agents: Map<string, AgentCard> = new Map();
  private messages: A2AMessage[] = [];
  private tasks: Map<string, A2ATask> = new Map();
  private handlers: Map<string, (msg: A2AMessage) => Promise<A2AMessage>> = new Map();

  registerAgent(card: AgentCard): void {
    this.agents.set(card.agentId, card);
    this.handlers.set(card.agentId, async (msg) => ({
      id: `rsp-${Date.now()}`, from: card.agentId, to: msg.from,
      type: 'response', skill: msg.skill, payload: { received: true },
      timestamp: new Date().toISOString(), correlationId: msg.id,
    }));
  }

  unregisterAgent(agentId: string): boolean {
    this.handlers.delete(agentId);
    return this.agents.delete(agentId);
  }

  setHandler(agentId: string, handler: (msg: A2AMessage) => Promise<A2AMessage>): void {
    this.handlers.set(agentId, handler);
  }

  getAgent(agentId: string): AgentCard | undefined { return this.agents.get(agentId); }
  listAgents(): AgentCard[] { return Array.from(this.agents.values()); }

  async sendMessage(msg: A2AMessage): Promise<A2AMessage> {
    this.messages.push(msg);
    const handler = this.handlers.get(msg.to);
    if (!handler) {
      return { id: `err-${Date.now()}`, from: 'system', to: msg.from, type: 'error', skill: msg.skill, payload: { error: `Agent not found: ${msg.to}` }, timestamp: new Date().toISOString(), correlationId: msg.id };
    }
    try {
      const response = await handler(msg);
      this.messages.push(response);
      return response;
    } catch (err) {
      const errorMsg: A2AMessage = { id: `err-${Date.now()}`, from: msg.to, to: msg.from, type: 'error', skill: msg.skill, payload: { error: String(err) }, timestamp: new Date().toISOString(), correlationId: msg.id };
      this.messages.push(errorMsg);
      return errorMsg;
    }
  }

  async discoverCapabilities(agentId: string): Promise<AgentCard | null> {
    const msg: A2AMessage = {
      id: `discover-${Date.now()}`, from: 'discoverer', to: agentId,
      type: 'request', skill: 'a2a.discover', payload: {},
      timestamp: new Date().toISOString(),
    };
    const response = await this.sendMessage(msg);
    if (response.type === 'response' && response.payload.capabilities) {
      return response.payload.capabilities as AgentCard;
    }
    return this.getAgent(agentId) ?? null;
  }

  createTask(agentId: string, skill: string, input: Record<string, unknown>): A2ATask {
    const task: A2ATask = {
      id: `task-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      agentId, skill, input, status: 'pending',
      createdAt: new Date().toISOString(),
    };
    this.tasks.set(task.id, task);
    this.executeTask(task);
    return task;
  }

  private async executeTask(task: A2ATask): Promise<void> {
    task.status = 'running';
    const msg: A2AMessage = {
      id: `exec-${Date.now()}`, from: 'orchestrator', to: task.agentId,
      type: 'request', skill: task.skill, payload: task.input,
      timestamp: new Date().toISOString(),
    };
    const response = await this.sendMessage(msg);
    task.status = response.type === 'error' ? 'failed' : 'completed';
    task.output = response.payload;
    task.error = response.payload.error as string | undefined;
    task.completedAt = new Date().toISOString();
  }

  getTask(id: string): A2ATask | undefined { return this.tasks.get(id); }
  listTasks(agentId?: string): A2ATask[] {
    if (agentId) return Array.from(this.tasks.values()).filter(t => t.agentId === agentId);
    return Array.from(this.tasks.values());
  }
  getMessages(): A2AMessage[] { return [...this.messages]; }

  updateAgentStatus(agentId: string, status: AgentCardStatus): void {
    const agent = this.agents.get(agentId);
    if (agent) agent.status = status;
  }
}

export function createA2AProtocol(): A2AProtocol {
  return new A2AProtocol();
}
