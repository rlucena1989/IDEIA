import type { MemoryPattern, LearningRecommendation } from '@ideia/contracts';

export function generateRecommendations(patterns: MemoryPattern[]): LearningRecommendation[] {
  return patterns.map(pattern => ({
    recommendationId: `rec-${Date.now()}-${pattern.name}`,
    target: pattern.name,
    action: pattern.confidence >= 0.8 ? 'apply_policy_tuning' : 'monitor_more',
    rationale: `Pattern frequency ${pattern.frequency} with confidence ${pattern.confidence}.`,
    confidence: pattern.confidence,
  }));
}
