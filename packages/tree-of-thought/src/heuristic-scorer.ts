import { EvaluationScore, Goal, ThoughtStrategy } from './types';
import { createLogger } from '@ideia/logger';
import { ThoughtNode } from './thought-node';
const logger = createLogger('heuristic-scorer');

export class HeuristicScorer {
  private readonly WEIGHTS = {
    coverage: 0.35,
    granularity: 0.25,
    acyclicity: 0.25,
    cost: 0.15,
  };

  evaluate(thought: ThoughtNode, goal: Goal): EvaluationScore {
    const coverage = this._computeCoverage(thought, goal);
    const granularity = this._computeGranularity(thought);
    const acyclicity = this._computeAcyclicity(thought);
    const cost = this._computeCost(thought);

    const total =
      coverage * this.WEIGHTS.coverage +
      granularity * this.WEIGHTS.granularity +
      acyclicity * this.WEIGHTS.acyclicity +
      (1 - cost) * this.WEIGHTS.cost;

    thought.updateWithEvaluation({ coverage, granularity, acyclicity, cost, total } as any);

    return { coverage, granularity, acyclicity, cost, total };
  }

  evaluateBatch(thoughts: ThoughtNode[], goal: Goal): Map<string, EvaluationScore> {
    const scores = new Map<string, EvaluationScore>();
    for (const thought of thoughts) {
      scores.set(thought.id, this.evaluate(thought, goal));
    }
    return scores;
  }

  private _computeCoverage(thought: ThoughtNode, goal: Goal): number {
    const goalTerms = this._extractKeyTerms(goal.description);
    const thoughtTerms = new Set(
      thought.content.toLowerCase().match(/\b\w{4,}\b/g) || []
    );
    if (goalTerms.size === 0) return 0.5;
    const intersection = new Set(
      [...goalTerms].filter(t => thoughtTerms.has(t))
    );
    return intersection.size / goalTerms.size;
  }

  private _extractKeyTerms(text: string): Set<string> {
    const stopWords = new Set([
      'para', 'com', 'uma', 'como', 'dos', 'das', 'mais',
      'que', 'this', 'that', 'with', 'from', 'the', 'and',
    ]);
    return new Set(
      text.toLowerCase()
        .match(/\b\w{4,}\b/g)
        ?.filter(w => !stopWords.has(w)) || []
    );
  }

  private _computeGranularity(thought: ThoughtNode): number {
    const wordCount = thought.content.split(/\s+/).length;
    const targetWords = Math.max(10, 50 - thought.depth * 5);
    const ratio = wordCount / targetWords;
    if (ratio > 2) return 0.3;
    if (ratio < 0.3) return 0.2;
    return 1 - Math.abs(1 - ratio) * 0.5;
  }

  private _computeAcyclicity(thought: ThoughtNode): number {
    if (!thought.parentId) return 1.0;
    const thoughtId = thought.id.substring(0, 8);
    const selfRefPattern = new RegExp(thoughtId, 'i');
    if (selfRefPattern.test(thought.content)) return 0.4;
    const overlap = this._computeOverlap(thought.content, thought.content);
    if (overlap > 0.8) return 0.3;
    return 1.0;
  }

  private _computeOverlap(a: string, b: string): number {
    const wordsA = new Set(a.toLowerCase().split(/\s+/));
    const wordsB = new Set(b.toLowerCase().split(/\s+/));
    const intersection = new Set([...wordsA].filter(w => wordsB.has(w)));
    const union = new Set([...wordsA, ...wordsB]);
    return union.size === 0 ? 0 : intersection.size / union.size;
  }

  private _computeCost(thought: ThoughtNode): number {
    const estimatedTokens = thought.content.length / 4;
    const maxTokens = 500;
    return Math.min(1, estimatedTokens / maxTokens);
  }

  static fallbackGenerate(goal: Goal, strategy: ThoughtStrategy, depth: number): string {
    const prefix = `[${strategy}] Level ${depth}: `;
    switch (strategy) {
      case 'top-down':
        return `${prefix}Phase ${depth}: ${goal.description} -- planning stage`;
      case 'bottom-up':
        return `${prefix}Task ${depth}: implement ${goal.description} component`;
      case 'lateral-thinking':
        return `${prefix}Alternative approach ${depth}: consider different architecture for ${goal.description}`;
      case 'first-principles':
        return `${prefix}Core requirement ${depth}: fundamental constraint of ${goal.description}`;
      case 'diagnostic':
        return `${prefix}Hypothesis ${depth}: potential root cause in ${goal.description}`;
      case 'compositional':
        return `${prefix}Sub-module ${depth}: component of ${goal.description}`;
      default:
        return `${prefix}Step ${depth}: work on ${goal.description}`;
    }
  }
}
