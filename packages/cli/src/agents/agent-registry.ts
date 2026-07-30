import { OperationalAgent } from './agent-types';
import { createLogger } from '@ideia/logger';
const logger = createLogger('agent-registry');

export class AgentRegistry {
  private agents: OperationalAgent[] = [];

  register(agent: OperationalAgent): void {
    const idx = this.agents.findIndex(a => a.agentId === agent.agentId);
    if (idx >= 0) {
      this.agents[idx] = { ...agent, updatedAt: new Date().toISOString() };
      return;
    }
    this.agents.push(agent);
  }

  list(): OperationalAgent[] {
    return [...this.agents];
  }

  get(agentId: string): OperationalAgent | undefined {
    return this.agents.find(a => a.agentId === agentId);
  }

  filterByRole(role: OperationalAgent['role']): OperationalAgent[] {
    return this.agents.filter(a => a.role === role);
  }

  filterByStatus(status: OperationalAgent['status']): OperationalAgent[] {
    return this.agents.filter(a => a.status === status);
  }

  count(): number {
    return this.agents.length;
  }
}
