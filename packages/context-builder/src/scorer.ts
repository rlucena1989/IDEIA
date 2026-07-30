import { ContextItem, ScoredContextItem, TaskProfile, ContextComposerConfig } from './types';
import { createLogger } from '@ideia/logger';

const DEFAULT_CONFIG = {
  minConfidence: 0.3,
  freshnessDecayHours: 72,
  categoryWeights: {
    decision: 10,
    pattern: 8,
    architecture: 9,
    policy: 8,
    error: 7,
    checkpoint: 6,
    history: 5,
    preference: 4,
    doc: 3,
    code: 3,
    log: 2,
  },
};

export class RelevanceScorer {
  private config: typeof DEFAULT_CONFIG;

  constructor(config?: Partial<typeof DEFAULT_CONFIG>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  score(items: ContextItem[], profile: TaskProfile): ScoredContextItem[] {
    return items
      .map(item => this.scoreItem(item, profile))
      .filter(s => s.confidence >= this.config.minConfidence && s.score > 0)
      .sort((a, b) => b.score - a.score);
  }

  private scoreItem(item: ContextItem, profile: TaskProfile): ScoredContextItem {
    const reasons: string[] = [];
    let score = 0;

    const categoryWeight = this.config.categoryWeights[item.category] ?? 1;
    score += categoryWeight * 2;
    reasons.push(`category=${item.category} weight=${categoryWeight}`);

    const freshnessScore = this.calculateFreshness(item.freshness);
    score += freshnessScore * 5;
    if (freshnessScore > 0.7) reasons.push('fresh');
    if (freshnessScore < 0.3) reasons.push('stale');

    score += item.confidence * 10;
    if (item.confidence >= 0.8) reasons.push('high_confidence');
    if (item.confidence < 0.5) reasons.push('low_confidence');

    score += item.priority * 2;
    if (item.priority >= 8) reasons.push('high_priority');

    const tagMatch = this.scoreTagRelevance(item.tags, profile);
    score += tagMatch * 5;
    if (tagMatch > 0.5) reasons.push(`tag_match=${Math.round(tagMatch * 100)}%`);

    return {
      ...item,
      score: Math.round(score * 100) / 100,
      scoreReasons: reasons,
    };
  }

  private calculateFreshness(freshness: number): number {
    if (freshness >= 1) return 1;
    if (freshness <= 0) return 0;
    return freshness;
  }

  private scoreTagRelevance(tags: string[], profile: TaskProfile): number {
    if (tags.length === 0) return 0;

    const profileTerms = [
      profile.domain,
      profile.language,
      profile.taskType,
      profile.scope,
    ].filter((t): t is string => t != null).map(t => t.toLowerCase());

    if (profileTerms.length === 0) return 0.3;

    const matchCount = tags.filter(tag =>
      profileTerms.some(term => tag.toLowerCase().includes(term)),
    ).length;

    return matchCount / Math.max(tags.length, 1);
  }
}
