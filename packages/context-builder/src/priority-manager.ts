import { ContextSource } from './types-budget';
import { createLogger } from '@ideia/logger';
import { SourceNeed } from './types-budget';
import { TaskProfile } from './types-budget';
const logger = createLogger('priority-manager');

const BASE_TYPE_WEIGHTS: Record<string, number> = {
  system: 100,
  instruction: 90,
  tool: 70,
  memory: 50,
  history: 30,
  document: 20,
};

export class PriorityManager {
  private learningWeights: Map<string, number> = new Map();

  computeUrgency(source: ContextSource, profile: TaskProfile): number {
    const baseWeight = BASE_TYPE_WEIGHTS[source.type] ?? 10;
    const priorityBonus = source.priority * 5;
    const relevanceScore = this.computeRelevance(source, profile);
    const learningBonus = this.learningWeights.get(source.id) ?? 0;

    return baseWeight + priorityBonus + relevanceScore + learningBonus;
  }

  computeRelevance(source: ContextSource, profile: TaskProfile): number {
    let score = 0;

    if (source.name.toLowerCase().includes(profile.taskType)) {
      score += 20;
    }

    const domainMatch = profile.requiredDomains.some(
      domain =>
        source.name.toLowerCase().includes(domain) ||
        source.content.toLowerCase().includes(domain)
    );
    if (domainMatch) {
      score += 15;
    }

    if (source.tokenCount <= profile.maxResponseTokens * 2) {
      score += 10;
    }

    return score;
  }

  rankSources(needs: SourceNeed[], profile: TaskProfile): SourceNeed[] {
    return [...needs]
      .map(need => ({
        ...need,
        urgency: need.urgency + this.computeNeedRelevance(need, profile),
      }))
      .sort((a, b) => {
        if (a.isRequired !== b.isRequired) {
          return a.isRequired ? -1 : 1;
        }
        return b.urgency - a.urgency || b.priority - a.priority;
      });
  }

  adjustPriority(source: ContextSource, feedback: { wasReferenced: boolean }): void {
    const current = this.learningWeights.get(source.id) ?? 0;
    if (feedback.wasReferenced) {
      this.learningWeights.set(source.id, Math.min(50, current + 5));
    } else {
      this.learningWeights.set(source.id, Math.max(-50, current - 5));
    }
  }

  learnFromOutcome(need: SourceNeed, wasReferenced: boolean): void {
    const current = this.learningWeights.get(need.sourceId) ?? 0;
    if (wasReferenced) {
      this.learningWeights.set(need.sourceId, Math.min(50, current + 10));
    } else {
      this.learningWeights.set(need.sourceId, Math.max(-50, current - 10));
    }
  }

  private computeNeedRelevance(need: SourceNeed, profile: TaskProfile): number {
    let score = 0;
    if (profile.complexity === 'high') {
      score += 5;
    }
    if (need.desiredTokens <= profile.maxResponseTokens) {
      score += 5;
    }
    return score;
  }
}
