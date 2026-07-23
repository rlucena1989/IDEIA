export interface AgentRegistration {
  role: string;
  capabilities: string[];
  description: string;
  maxConcurrency: number;
  timeout: number;
}

export class AgentRegistry {
  private agents: Map<string, AgentRegistration> = new Map();

  registerAgent(role: string, config: AgentRegistration): void {
    this.agents.set(role, config);
  }

  getAgent(role: string): AgentRegistration | undefined {
    return this.agents.get(role);
  }

  listAgents(): AgentRegistration[] {
    return Array.from(this.agents.values());
  }

  findAgentsByCapability(capability: string): AgentRegistration[] {
    return Array.from(this.agents.values()).filter(a =>
      a.capabilities.includes(capability)
    );
  }

  getDefaultAgents(): AgentRegistration[] {
    return [
      { role: 'analyst', capabilities: ['analysis', 'requirements', 'clarification'], description: 'Analyzes requirements and clarifies user needs', maxConcurrency: 2, timeout: 30000 },
      { role: 'architect', capabilities: ['architecture', 'design', 'technology'], description: 'Designs system architecture and makes technology decisions', maxConcurrency: 2, timeout: 30000 },
      { role: 'programmer', capabilities: ['implementation', 'coding', 'development'], description: 'Implements features following architecture', maxConcurrency: 3, timeout: 60000 },
      { role: 'reviewer', capabilities: ['review', 'code-review', 'quality'], description: 'Reviews code for correctness, security, and quality', maxConcurrency: 3, timeout: 30000 },
      { role: 'tester', capabilities: ['testing', 'test-creation', 'coverage'], description: 'Creates comprehensive tests for implemented code', maxConcurrency: 3, timeout: 30000 },
      { role: 'devops', capabilities: ['devops', 'ci-cd', 'infrastructure', 'deployment'], description: 'Configures CI/CD, infrastructure, and deployment', maxConcurrency: 2, timeout: 30000 },
      { role: 'supervisor', capabilities: ['supervision', 'coordination', 'decision'], description: 'Coordinates agents, resolves conflicts, and decides next steps', maxConcurrency: 1, timeout: 15000 },
      { role: 'parallel_reviewer_tester', capabilities: ['review', 'testing', 'parallel'], description: 'Runs reviewer and tester in parallel', maxConcurrency: 2, timeout: 30000 },
    ];
  }
}

export function createAgentRegistry(): AgentRegistry {
  const registry = new AgentRegistry();
  const defaults = registry.getDefaultAgents();
  for (const agent of defaults) {
    registry.registerAgent(agent.role, agent);
  }
  return registry;
}
