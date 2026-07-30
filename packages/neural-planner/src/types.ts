export interface Goal {
  description: string;
  complexity: number;
  domain: string;
  stepCount?: number;
  fileCount?: number;
  constraints?: string[];
}

export interface PlanningContext {
  projectType?: string;
  language?: string;
  hasExistingCode: boolean;
  fileCount: number;
  languages?: string[];
  agentSkillLevel: number;
  similarProjects: number;
  timeEstimate: number;
  historyLength: number;
  isBugfix?: boolean;
  isRefactor?: boolean;
  complexity?: number;
}

export interface PlannedStep {
  id: string;
  description: string;
  filesAffected: string[];
  estimatedTokens: number;
  dependencies: string[];
  acceptanceCriteria: string[];
  alternative?: boolean;
}

export interface DecompositionExample {
  goal: Goal;
  context: PlanningContext;
  steps: PlannedStep[];
}

export interface LoRAConfig {
  baseModel: string;
  rank: number;
  alpha: number;
}

export interface TrainingRunConfig {
  epochs: number;
  batchSize: number;
  learningRate: number;
  validationSplit: number;
}

export interface PlanningAction {
  strategy: string;
  granularity: 'coarse' | 'medium' | 'fine';
  temperature: number;
}

export interface PPOConfig {
  clipEpsilon: number;
  valueCoeff: number;
  entropyCoeff: number;
  epochs: number;
  batchSize: number;
  gamma: number;
  lambda: number;
}

export interface Experience {
  state: number[];
  action: number;
  reward: number;
  done: boolean;
  logProb: number;
  value?: number;
}

export interface PlanExecution {
  completedSteps: number;
  totalSteps: number;
  estimatedTokens: number;
  actualTokens: number;
  replanCount: number;
  qualityScore: number;
  wallTimeMs: number;
  estimatedTimeMs: number;
}

export interface DecompositionPath {
  path: PlannedStep[];
  score: number;
}

export interface TaskFamily {
  name: string;
  tasks: Task[];
}

export interface Task {
  goal: Goal;
  context: PlanningContext;
  optimalSteps: PlannedStep[];
  reward: number;
}

export interface MAMLMetrics {
  metaLosses: number[];
  taskAccuracies: number[];
  adaptationSteps: number[];
}

export interface BenchmarkResult {
  plannerName: string;
  planningTimeMs: number;
  successRate: number;
  tokenEfficiency: number;
  stepsOptimality: number;
  rewardAvg: number;
  samplesUsed: number;
}
