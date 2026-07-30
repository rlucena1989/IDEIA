import { Task, ComplexityLevel, PipelineRoute, Agent } from './types';
import { createLogger } from '@ideia/logger';
const logger = createLogger('routing');

export class RoutingEngine {
  classifyComplexity(task: Task): ComplexityLevel {
    const factors = {
      filesAffected: task.files.length,
      dependencies: task.dependencies,
      riskLevel: task.riskScore,
      ambiguity: task.ambiguityLevel,
      hasExternalIntegrations: task.integrations.length > 0,
      requiresArchitecturalDecision: task.requiresADR,
    };

    let score = 0;
    if (factors.filesAffected > 5) score += 2;
    if (factors.dependencies > 3) score += 2;
    if (factors.riskLevel > 0.7) score += 3;
    if (factors.ambiguity > 0.5) score += 2;
    if (factors.hasExternalIntegrations) score += 2;
    if (factors.requiresArchitecturalDecision) score += 3;

    if (score <= 1) return 'trivial';
    if (score <= 3) return 'simple';
    if (score <= 5) return 'moderate';
    if (score <= 8) return 'complex';
    return 'critical';
  }

  selectPipeline(complexity: ComplexityLevel): PipelineRoute {
    const routes: Record<ComplexityLevel, PipelineRoute> = {
      trivial: { pipeline: 'rule-only', expectedTokens: 0, agents: 0 },
      simple: { pipeline: 'llm-light', expectedTokens: 500, agents: 1 },
      moderate: { pipeline: 'llm-plan-execute', expectedTokens: 2000, agents: 2 },
      complex: { pipeline: 'multi-agent', expectedTokens: 5000, agents: 4 },
      critical: { pipeline: 'multi-agent-review', expectedTokens: 10000, agents: 5 },
    };
    return { ...routes[complexity] };
  }

  selectAgent(task: Task, agents: Agent[]): Agent | null {
    let best: Agent | null = null;
    let bestScore = -Infinity;

    for (const agent of agents) {
      if (!this.hasCapabilityFor(agent, task)) continue;
      if (agent.currentLoad >= agent.maxLoad) continue;

      const capabilityMatch = this.capabilityMatchScore(agent, task);
      const loadScore = 1 - (agent.currentLoad / agent.maxLoad);
      const historyScore = this.taskHistoryScore(agent, task.type);

      const score = capabilityMatch * 0.4 + loadScore * 0.3 + historyScore * 0.3;

      if (score > bestScore) {
        bestScore = score;
        best = agent;
      }
    }

    return best;
  }

  private hasCapabilityFor(agent: Agent, task: Task): boolean {
    return agent.capabilities.some(c => task.type.includes(c) || c.includes(task.type));
  }

  private capabilityMatchScore(agent: Agent, task: Task): number {
    const matches = agent.capabilities.filter(c => task.type.includes(c) || c.includes(task.type));
    return Math.min(1, matches.length / 3);
  }

  private taskHistoryScore(agent: Agent, taskType: string): number {
    const relevant = agent.taskHistory.filter(h => h.type === taskType);
    if (relevant.length === 0) return 0.5;
    return relevant.filter(h => h.success).length / relevant.length;
  }
}

export function createRoutingEngine(): RoutingEngine {
  return new RoutingEngine();
}
