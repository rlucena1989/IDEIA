export interface PlanningAction {
  strategy: string;
  granularity: 'coarse' | 'medium' | 'fine';
  temperature: number;
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

export interface Experience {
  state: Float32Array;
  action: PlanningAction;
  reward: number;
  nextState: Float32Array;
  done: boolean;
  logProb?: number;
  advantage?: number;
  return?: number;
}

export interface PolicyOutput {
  mean: Float32Array;
  logStd: Float32Array;
}

export interface PPOLosses {
  policyLoss: number;
  valueLoss: number;
  entropy: number;
  totalLoss: number;
  clipFraction: number;
  approxKL: number;
}

export interface TrainingMetrics {
  epoch: number;
  avgReward: number;
  avgEpisodeLength: number;
  policyLoss: number;
  valueLoss: number;
  entropy: number;
  clipFraction: number;
  convergenceScore: number;
}

export interface Trajectory {
  totalReward: number;
  steps: number;
}

export interface Goal {
  description: string;
  complexity: number;
  domain: string;
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
}

export interface PlanningEnv {
  reset(): Float32Array;
  step(action: PlanningAction): { nextState: Float32Array; reward: number; done: boolean };
  getProgress(): number;
  isDone(): boolean;
  getMetrics(): PlanExecution;
}
