export type ComplexityLevel = 'N0' | 'N1' | 'N2' | 'N3' | 'N4' | 'N5';

export type TaskType =
  | 'feature'
  | 'bugfix'
  | 'refactor'
  | 'test'
  | 'documentation'
  | 'devops'
  | 'review'
  | 'question'
  | 'unknown';

export type CompressionStrategy = 'summarize' | 'deduplicate' | 'priority_rank' | 'budget_cut' | 'full';

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
  id?: string;
  tokenCount?: number;
}

export interface ContextItem {
  id: string;
  content: string;
  source: string;
  priority: number;
  tokenCount: number;
  timestamp: string;
}

export interface CompressorInput {
  messages: ChatMessage[];
  contextItems: ContextItem[];
  maxTokens: number;
  strategy: CompressionStrategy;
}

export interface CompressorOutput {
  messages: ChatMessage[];
  contextItems: ContextItem[];
  originalTokens: number;
  compressedTokens: number;
  savings: number;
  removedIds: string[];
}

export interface TokenBudget {
  taskType: TaskType;
  complexityLevel: ComplexityLevel;
  maxTokens: number;
  warningThreshold: number;
  hardLimit: number;
}

export interface BudgetAllocation {
  taskId: string;
  budget: TokenBudget;
  spent: number;
  startedAt: string;
  stageBudgets: Record<string, number>;
}

export interface EarlyExitDecision {
  shouldExit: boolean;
  reason?: string;
  confidence: number;
  evidence: string[];
}

export interface Evidence {
  type: string;
  value: unknown;
  confidence: number;
}

export interface ComplexityClassification {
  level: ComplexityLevel;
  reasons: string[];
  confidence: number;
  estimatedTokens: number;
}

export interface PipelineConfig {
  requirePlan: boolean;
  requireVerification: boolean;
  requireApproval: boolean;
  parallelAgents: boolean;
  maxSteps: number;
  tokenBudget: number;
  stages: string[];
}

export interface CacheEntry<T> {
  key: string;
  value: T;
  createdAt: string;
  ttlMs: number;
  accessCount: number;
  lastAccessed: string;
}

export interface CacheHit<T> {
  found: boolean;
  value?: T;
  entry?: CacheEntry<T>;
}

export interface LLMCacheConfig {
  planCacheTtlMs: number;
  decisionCacheTtlMs: number;
  embeddingCacheTtlMs: number;
  maxEntries: number;
}

export interface PromptEconomyConfig {
  defaultBudget: number;
  enableCompression: boolean;
  enableEarlyExit: boolean;
  enableCache: boolean;
  enableRouting: boolean;
  cacheConfig: LLMCacheConfig;
  budgetByLevel: Record<ComplexityLevel, number>;
  warningThreshold: number;
  hardLimitMultiplier: number;
}
