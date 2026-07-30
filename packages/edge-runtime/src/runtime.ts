import { EdgeAgent } from './types';
import { createLogger } from '@ideia/logger';
const logger = createLogger('runtime');

export class EdgeRuntime {
  private agents: Map<string, EdgeAgent> = new Map();
  private running = false;

  start(): void { this.running = true; }
  stop(): void { this.running = false; }
  isRunning(): boolean { return this.running; }

  registerAgent(agent: EdgeAgent): void { this.agents.set(agent.id, { ...agent, lastHeartbeat: Date.now() }); }
  unregisterAgent(id: string): void { this.agents.delete(id); }
  getAgent(id: string): EdgeAgent | undefined { return this.agents.get(id); }
  listAgents(): EdgeAgent[] { return Array.from(this.agents.values()); }

  healthCheck(): { healthy: boolean; agentCount: number; running: boolean } {
    const now = Date.now();
    let healthy = this.running;
    for (const agent of this.agents.values()) {
      if (now - agent.lastHeartbeat > 60000) { agent.status = 'error'; healthy = false; }
    }
    return { healthy, agentCount: this.agents.size, running: this.running };
  }
}
