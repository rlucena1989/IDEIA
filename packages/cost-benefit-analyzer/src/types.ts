export interface Goal {
  description: string;
  complexity: number;
  stepCount?: number;
  domain: string;
  fileCount?: number;
  constraints?: string[];
}

export interface PlanningContext {
  fileCount: number;
  agentSkillLevel: number;
  similarProjects: number;
  hasExistingCode: boolean;
  isBugfix?: boolean;
  isRefactor?: boolean;
  timeEstimate: number;
  historyLength: number;
  complexity?: number;
}

export interface CostBreakdown {
  base: number;
  complexity: number;
  files: number;
  dependencies: number;
  overhead: number;
  retries: number;
  total: number;
  estimatedSeconds: number;
  tokenBreakdown: {
    contextTokens: number;
    analysisTokens: number;
    generationTokens: number;
  };
}

export interface ROIResult {
  shouldPlan: boolean;
  roi: number;
  savings: number;
  breakEvenPlans: number;
  planCost: CostBreakdown;
  execCostWithoutPlan: CostBreakdown;
  execCostWithPlan: CostBreakdown;
  recommendedDepth: 'none' | 'shallow' | 'medium' | 'deep';
  confidence: 'low' | 'medium' | 'high';
  alternativeScenarios: Scenario[];
}

export interface Scenario {
  name: string;
  description: string;
  roi: number;
  probability: number;
}

export interface PlanningDecision {
  decision: 'plan' | 'execute_directly';
  depth?: 'none' | 'shallow' | 'medium' | 'deep';
  reason: string;
  roi?: ROIResult;
  optimization?: OptimizationResult;
}

export interface OptimizationResult {
  selectedAction: 'plan' | 'execute_directly';
  selectedDepth: 'none' | 'shallow' | 'medium' | 'deep';
  expectedUtility: number;
  alternatives: Array<{
    action: string;
    depth: string;
    utility: number;
    cost: number;
    quality: number;
  }>;
}

export interface CalibrationPoint {
  goalId: string;
  depth: string;
  predictedQuality: number;
  actualQuality: number;
  tokenCost: number;
  timestamp: number;
}

export interface CostAnalysisReport {
  combined: {
    direct: number;
    withShallowPlan: number;
    withDeepPlan: number;
  };
  planCost: CostBreakdown;
  execWithPlan: CostBreakdown;
  execWithoutPlan: CostBreakdown;
  tokenEstimate: number;
  timeEstimate: number;
  memoryEstimate: number;
}

export interface AnalyzerMetrics {
  calibrationAccuracy: number;
  adaptiveThreshold: number;
  totalEvaluations: number;
}

export interface RealOptionValue {
  callValue: number;
  intrinsicValue: number;
  timeValue: number;
  sigma: number;
  elasticity: number;
  recommendation: 'defer' | 'execute';
  confidence: number;
}

export interface BayesianEstimate {
  prior: { alpha: number; beta: number; mean: number };
  posterior: { alpha: number; beta: number; mean: number; std: number };
  credibleInterval95: { lower: number; upper: number };
  mcEstimate: { mean: number; p50: number; p95: number };
  samplesUsed: number;
}

export interface BanditArm {
  name: string;
  plays: number;
  totalReward: number;
  meanReward: number;
  lastPlayed: number;
}
