import { AgentCapability, TaskProfile, MatchingResult } from './types';
import { createLogger } from '@ideia/logger';
const logger = createLogger('matcher');

export class TaskAgentMatcher {
  match(task: TaskProfile, agents: AgentCapability[]): MatchingResult[] {
    const results: MatchingResult[] = agents.map(agent => this.scoreAgent(task, agent));
    results.sort((a, b) => b.score - a.score);
    return results;
  }

  findBestMatch(task: TaskProfile, agents: AgentCapability[]): MatchingResult | null {
    const results = this.match(task, agents);
    return results.length > 0 ? results[0] : null;
  }

  private scoreAgent(task: TaskProfile, agent: AgentCapability): MatchingResult {
    const agentSkills = agent.skills.map(s => s.name);
    const matchedSkills = task.requiredSkills.filter(s => agentSkills.includes(s));
    const missingSkills = task.requiredSkills.filter(s => !agentSkills.includes(s));

    const skillScore = task.requiredSkills.length > 0
      ? matchedSkills.length / task.requiredSkills.length
      : 0;

    const loadScore = agent.maxLoad > 0
      ? 1 - (agent.currentLoad / agent.maxLoad)
      : 0;

    const historyScore = this.calculateHistoryScore(agent);

    const score = (skillScore * 0.6) + (loadScore * 0.25) + (historyScore * 0.15);

    return {
      agentId: agent.agentId,
      score: Math.round(score * 100) / 100,
      matchedSkills,
      missingSkills,
    };
  }

  private calculateHistoryScore(agent: AgentCapability): number {
    if (agent.history.length === 0) return 0.5;

    const recentHistory = agent.history.slice(-10);
    const successRate = recentHistory.filter(h => h.success).length / recentHistory.length;

    return successRate;
  }
}

export function createTaskAgentMatcher(): TaskAgentMatcher {
  return new TaskAgentMatcher();
}
