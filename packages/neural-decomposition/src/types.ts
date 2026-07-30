export type TaskComplexity = 'simple' | 'moderate' | 'complex' | 'very-complex'
export type StrategyType = 'top-down' | 'bottom-up' | 'hybrid' | 'rl-optimized'

export interface Task {
  id: string
  description: string
  complexity: TaskComplexity
  subtasks: Task[]
  estimatedTokens: number
  dependencies: string[]
}

export interface DecompositionResult {
  originalTask: string
  subtasks: Task[]
  depth: number
  totalSubtasks: number
  strategy: StrategyType
  qualityScore: number
}

export interface RLState {
  taskId: string
  remainingSubtasks: number
  tokensUsed: number
  timeElapsed: number
  quality: number
}

export interface RLAction {
  type: 'decompose' | 'execute' | 'merge' | 'skip' | 'replan'
  target: string
  expectedReward: number
}

export interface RLExperience {
  state: RLState
  action: RLAction
  reward: number
  nextState: RLState
}

export interface PlanningStrategy {
  type: StrategyType
  name: string
  description: string
  expectedEfficiency: number
}

export interface OptimizationResult {
  taskId: string
  originalCost: number
  optimizedCost: number
  savingsPercent: number
  strategyUsed: StrategyType
  recommendations: string[]
}
