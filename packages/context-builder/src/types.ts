export interface TaskProfile {
  taskType: 'feature' | 'bugfix' | 'refactor' | 'test' | 'documentation' | 'devops' | 'review' | 'question' | 'unknown';
  scope: 'single_file' | 'multi_file' | 'module' | 'cross_module' | 'project';
  domain?: string;
  language?: string;
  complexity: 'low' | 'medium' | 'high';
  risk: 'low' | 'medium' | 'high' | 'critical';
  environment: 'dev' | 'staging' | 'production';
}

export interface ContextSource {
  name: string;
  priority: number;
  maxItems: number;
}

export interface ContextItem {
  id: string;
  content: string;
  source: string;
  category: 'decision' | 'pattern' | 'architecture' | 'history' | 'preference' | 'policy' | 'log' | 'doc' | 'code' | 'error' | 'checkpoint';
  priority: number;
  confidence: number;
  freshness: number;
  tokenCount: number;
  timestamp: string;
  tags: string[];
}

export interface ScoredContextItem extends ContextItem {
  score: number;
  scoreReasons: string[];
}

export interface ProvenanceEntry {
  itemId: string;
  action: 'included' | 'excluded' | 'deduplicated' | 'trimmed';
  reason: string;
  source: string;
  score?: number;
}

export interface ComposedContext {
  items: ScoredContextItem[];
  totalTokens: number;
  tokenBudget: number;
  utilization: number;
  sourcesUsed: string[];
  provenance: ProvenanceEntry[];
  composedAt: string;
  summary: string;
}

export interface ContextComposerConfig {
  defaultTokenBudget: number;
  minConfidence: number;
  maxItemsPerSource: number;
  dedupSimilarityThreshold: number;
  freshnessDecayHours: number;
  enableProvenance: boolean;
  sourcePriorities: Record<string, number>;
  categoryWeights: Record<string, number>;
}

export interface ContextAggregatorResult {
  items: ContextItem[];
  sourceName: string;
}
