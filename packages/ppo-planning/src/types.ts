export interface PPOState { features: number[]; reward: number; done: boolean }
export interface PPOAction { id: number; name: string }
export interface PPOPolicy { 
  actionProbs: number[]; 
  value: number; 
  update(advantages: number[], returns: number[]): void 
}
export interface TrainingEpisode {
  episode: number; totalReward: number; avgLoss: number; steps: number; epsilon: number
}
export interface PlanningOptimization {
  taskType: string; 
  beforeCost: number; 
  afterCost: number; 
  improvement: number; 
  policyId: string
}
