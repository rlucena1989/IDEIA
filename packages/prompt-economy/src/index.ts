export { ContextCompressor } from './compressor/index';
export { BudgetManager, BudgetTracker, EarlyExitDecider } from './budget/index';
export type { EarlyExitConfig } from './budget/early-exit';
export { ComplexityRouter } from './router/index';
export type { ComplexityCriteria } from './router/complexity-router';
export { LLMCache } from './cache/index';

export type {
  ComplexityLevel,
  TaskType,
  CompressionStrategy,
  ChatMessage,
  ContextItem,
  CompressorInput,
  CompressorOutput,
  TokenBudget,
  BudgetAllocation,
  EarlyExitDecision,
  Evidence,
  ComplexityClassification,
  PipelineConfig,
  CacheEntry,
  CacheHit,
  LLMCacheConfig,
  PromptEconomyConfig,
} from './types';

export { TokenAnalyzer } from './analytics/token-analyzer';
export { CostTracker } from './analytics/cost-tracker';
export { OptimizationRecommender } from './analytics/optimization-recommender';
export { AnalyticsDashboard } from './analytics/dashboard';

export type {
  Provider,
  TaskType as AnalyticsTaskType,
  Period,
  BudgetPriority,
  RecommendationType,
  RecommendationPriority,
  AlertSeverity,
  AlertType,
  RefinementTechnique,
  ContextSource,
  LLMCallRecord,
  AnalyticsConfig,
  AgentBudgetUsage,
  SourceAnalysis,
  WasteSource,
  WasteReport,
  SourceBreakdown,
  Recommendation,
  CompressionSuggestion,
  CacheSuggestion,
  ProviderSuggestion,
  RefinementSuggestion,
  DashboardSummary,
  EfficiencyReport,
  AgentRanking,
  ProviderComparison,
  Alert,
} from './analytics/types-analytics';

import { ContextCompressor } from './compressor/index';
import { createLogger } from '@ideia/logger';
import { BudgetManager, BudgetTracker, EarlyExitDecider } from './budget/index';
import { ComplexityRouter } from './router/index';
import { LLMCache } from './cache/index';
import { PromptEconomyConfig, ComplexityLevel, TaskType } from './types';
const logger = createLogger('index');

export class PromptEconomy {
  readonly compressor: ContextCompressor;
  readonly budgetManager: BudgetManager;
  readonly budgetTracker: BudgetTracker;
  readonly earlyExit: EarlyExitDecider;
  readonly router: ComplexityRouter;
  readonly cache: LLMCache;
  readonly config: PromptEconomyConfig;

  constructor(config?: Partial<PromptEconomyConfig>) {
    this.config = {
      defaultBudget: 4000,
      enableCompression: true,
      enableEarlyExit: true,
      enableCache: true,
      enableRouting: true,
      cacheConfig: {
        planCacheTtlMs: 3600000,
        decisionCacheTtlMs: 300000,
        embeddingCacheTtlMs: 600000,
        maxEntries: 1000,
      },
      budgetByLevel: {
        N0: 500,
        N1: 2000,
        N2: 4000,
        N3: 8000,
        N4: 15000,
        N5: 25000,
      },
      warningThreshold: 0.8,
      hardLimitMultiplier: 1.5,
      ...config,
    };

    this.compressor = new ContextCompressor();
    this.budgetManager = new BudgetManager(this.config.budgetByLevel);
    this.budgetTracker = new BudgetTracker();
    this.earlyExit = new EarlyExitDecider();
    this.router = new ComplexityRouter();
    this.cache = new LLMCache(this.config.cacheConfig);
  }

  async estimateCost(taskType: TaskType, level: ComplexityLevel): Promise<{
    maxTokens: number;
    estimatedTokens: number;
    pipelineStages: string[];
  }> {
    const budget = this.budgetManager.getBudget(taskType, level);
    const pipeline = this.router.getPipeline(level);
    const estimated = this.budgetManager.estimateTaskTokens(taskType, level);

    return {
      maxTokens: budget.maxTokens,
      estimatedTokens: estimated,
      pipelineStages: pipeline.stages,
    };
  }
}

export function createPromptEconomy(config?: Partial<PromptEconomyConfig>): PromptEconomy {
  return new PromptEconomy(config);
}
