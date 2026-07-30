import { TaskProfile, ContextItem, ContextSource, ComposedContext, ContextComposerConfig, ScoredContextItem } from './types';
import { createLogger } from '@ideia/logger';
import { ContextAggregator } from './aggregator';
import { RelevanceScorer } from './scorer';
import { ContextDeduplicator } from './deduplicator';
import { ContextProvenance } from './provenance';
import { ContextSerializer } from './serializer';
const logger = createLogger('composer');

const DEFAULT_CONFIG: ContextComposerConfig = {
  defaultTokenBudget: 4000,
  minConfidence: 0.3,
  maxItemsPerSource: 20,
  dedupSimilarityThreshold: 0.85,
  freshnessDecayHours: 72,
  enableProvenance: true,
  sourcePriorities: {
    decisions: 10,
    architecture: 9,
    policy: 8,
    patterns: 8,
    errors: 7,
    checkpoints: 6,
    preferences: 5,
    history: 5,
    docs: 4,
    code: 3,
    logs: 2,
  },
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

export class ContextComposer {
  readonly aggregator: ContextAggregator;
  readonly scorer: RelevanceScorer;
  readonly deduplicator: ContextDeduplicator;
  readonly provenance: ContextProvenance;
  readonly serializer: ContextSerializer;
  readonly config: ContextComposerConfig;

  constructor(config?: Partial<ContextComposerConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.aggregator = new ContextAggregator();
    this.scorer = new RelevanceScorer();
    this.deduplicator = new ContextDeduplicator(this.config.dedupSimilarityThreshold);
    this.provenance = new ContextProvenance();
    this.serializer = new ContextSerializer();
  }

  async compose(profile: TaskProfile, sources?: ContextSource[], tokenBudget?: number): Promise<ComposedContext> {
    this.provenance.clear();
    const budget = tokenBudget ?? this.config.defaultTokenBudget;
    const time = new Date().toISOString();

    const sourcesToUse = sources ?? this.getDefaultSources(profile);
    const results = await this.aggregator.aggregate(profile, sourcesToUse);

    const allItems: ContextItem[] = [];
    const sourcesUsed: string[] = [];

    for (const result of results) {
      sourcesUsed.push(result.sourceName);
      allItems.push(...result.items);

      for (const item of result.items) {
        this.provenance.record(item.id, 'included', `Source: ${result.sourceName}`, result.sourceName);
      }
    }

    const deduped = this.deduplicator.deduplicate(allItems);
    const dedupedIds = new Set(deduped.map(d => d.id));
    for (const item of allItems) {
      if (!dedupedIds.has(item.id)) {
        this.provenance.record(item.id, 'deduplicated', 'Conteúdo duplicado', item.source);
      }
    }

    const scored = this.scorer.score(deduped, profile);

    const trimmed = this.trimByBudget(scored, budget);

    const trimmedIds = new Set(trimmed.map(t => t.id));
    for (const item of scored) {
      if (!trimmedIds.has(item.id)) {
        this.provenance.record(item.id, 'trimmed', `Excedeu orçamento de tokens (${budget})`, item.source, item.score);
      }
    }

    const totalTokens = trimmed.reduce((sum, item) => sum + item.tokenCount, 0);

    return {
      items: trimmed,
      totalTokens,
      tokenBudget: budget,
      utilization: budget > 0 ? Math.round((totalTokens / budget) * 100) : 0,
      sourcesUsed,
      provenance: this.provenance.getEntries(),
      composedAt: time,
      summary: this.buildSummary(trimmed, sourcesUsed, totalTokens, budget),
    };
  }

  private getDefaultSources(_profile: TaskProfile): ContextSource[] {
    return [
      { name: 'decisions', priority: this.config.sourcePriorities.decisions, maxItems: this.config.maxItemsPerSource },
      { name: 'architecture', priority: this.config.sourcePriorities.architecture, maxItems: this.config.maxItemsPerSource },
      { name: 'policy', priority: this.config.sourcePriorities.policy, maxItems: this.config.maxItemsPerSource },
      { name: 'patterns', priority: this.config.sourcePriorities.patterns, maxItems: this.config.maxItemsPerSource },
      { name: 'errors', priority: this.config.sourcePriorities.errors, maxItems: this.config.maxItemsPerSource },
      { name: 'history', priority: this.config.sourcePriorities.history, maxItems: this.config.maxItemsPerSource },
    ];
  }

  private trimByBudget(items: ScoredContextItem[], budget: number): ScoredContextItem[] {
    const result: ScoredContextItem[] = [];
    let used = 0;

    for (const item of items) {
      const cost = item.tokenCount;
      if (used + cost > budget) break;
      result.push(item);
      used += cost;
    }

    return result;
  }

  private buildSummary(
    items: ScoredContextItem[],
    sources: string[],
    totalTokens: number,
    budget: number,
  ): string {
    const categories = new Map<string, number>();
    for (const item of items) {
      categories.set(item.category, (categories.get(item.category) ?? 0) + 1);
    }
    const catSummary = Array.from(categories.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([cat, count]) => `${cat}=${count}`)
      .join(', ');

    return `Context: ${items.length} items from ${sources.length} sources, ${totalTokens}/${budget} tokens [${catSummary}]`;
  }
}
