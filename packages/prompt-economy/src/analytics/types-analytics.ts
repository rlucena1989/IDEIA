export type Provider = 'ollama' | 'openai' | 'deepseek';
export type TaskType = 'code' | 'conversation' | 'analysis' | 'planning';
export type Period = 'daily' | 'weekly' | 'monthly';
export type BudgetPriority = 'cost' | 'quality' | 'speed';
export type RecommendationType = 'compress' | 'cache' | 'switch_provider' | 'refine_prompt';
export type RecommendationPriority = 'high' | 'medium' | 'low';
export type AlertSeverity = 'info' | 'warning' | 'critical';
export type AlertType = 'budget_exceeded' | 'waste_threshold' | 'efficiency_drop' | 'cost_spike';
export type RefinementTechnique = 'summarize' | 'truncate' | 'restructure';

export interface ContextSource {
  source: string;
  tokensProvided: number;
  tokensReferenced: number;
  wasReferenced: boolean;
  priority: number;
  retrievalTime: number;
}

export interface LLMCallRecord {
  id: string;
  timestamp: number;
  agentId: string;
  provider: Provider;
  model: string;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  cost: number;
  latency: number;
  taskType: TaskType;
  contextSources: ContextSource[];
  compressed: boolean;
  compressionRatio: number;
  cacheHit: boolean;
}

export interface TokenBudget {
  softLimit: number;
  hardLimit: number;
  period: Period;
  priority: BudgetPriority;
}

export interface AgentBudgetUsage {
  agentId: string;
  periodStart: number;
  periodEnd: number;
  totalTokens: number;
  totalCost: number;
  budget: TokenBudget;
  percentUsed: number;
  topSources: Array<{ source: string; tokens: number; cost: number }>;
  recommendations: string[];
}

export interface SourceAnalysis {
  source: string;
  totalTokens: number;
  totalCost: number;
  timesReferenced: number;
  efficiency: number;
  wasteTokens: number;
  wastePercent: number;
}

export interface WasteSource {
  source: string;
  wastedTokens: number;
  wastedCost: number;
  reason: string;
}

export interface WasteReport {
  totalWasteTokens: number;
  totalWasteCost: number;
  topWasteSources: WasteSource[];
  recommendations: string[];
}

export interface SourceBreakdown {
  sources: Record<string, { tokens: number; cost: number; percentage: number }>;
}

export interface Recommendation {
  type: RecommendationType;
  priority: RecommendationPriority;
  description: string;
  expectedSavings: number;
  source: string;
  implementation: string;
}

export interface CompressionSuggestion {
  source: string;
  currentRatio: number;
  suggestedRatio: number;
  expectedSavings: number;
}

export interface CacheSuggestion {
  source: string;
  hitRate: number;
  suggestedTTL: number;
  expectedSavings: number;
}

export interface ProviderSuggestion {
  currentProvider: Provider;
  suggestedProvider: Provider;
  taskType: TaskType;
  expectedCostReduction: number;
  qualityImpact: string;
}

export interface RefinementSuggestion {
  targetTokens: number;
  currentTokens: number;
  reduction: number;
  technique: RefinementTechnique;
}

export interface DashboardSummary {
  period: { start: number; end: number };
  totalCalls: number;
  totalTokens: number;
  totalCost: number;
  averageCostPerCall: number;
  efficiency: number;
  wastePercent: number;
  cacheHitRate: number;
  topProviders: Array<{ provider: Provider; calls: number; tokens: number }>;
  topAgents: Array<{ agentId: string; tokens: number; cost: number }>;
}

export interface EfficiencyReport {
  overall: number;
  bySource: Record<string, number>;
  byAgent: Record<string, number>;
  byTaskType: Record<string, number>;
  byProvider: Record<string, number>;
}

export interface AgentRanking {
  agentId: string;
  totalTokens: number;
  totalCost: number;
  efficiency: number;
  avgLatency: number;
}

export interface ProviderComparison {
  provider: Provider;
  totalTokens: number;
  totalCost: number;
  avgLatency: number;
  avgTokensPerCall: number;
}

export interface Alert {
  type: AlertType;
  severity: AlertSeverity;
  message: string;
  timestamp: number;
  metric: number;
  threshold: number;
  actual: number;
}

export interface AnalyticsConfig {
  providerCostPer1K: Record<string, number>;
  wasteThreshold: number;
  efficiencyThreshold: number;
}
