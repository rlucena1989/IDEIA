export interface TaskExample {
  id: string
  input: string
  output: string
  taskType: string
  metadata: Record<string, unknown>
}

export interface TaskDistribution {
  name: string
  tasks: TaskExample[][]
  metaBatch: TaskExample[]
  evalBatch: TaskExample[]
}

export interface MAMLConfig {
  innerSteps: number
  innerLR: number
  outerLR: number
  metaBatchSize: number
}

export interface MetaGradient {
  parameters: Record<string, number>
  loss: number
  step: number
}

export interface AdaptationResult {
  taskId: string
  initialLoss: number
  finalLoss: number
  steps: number
  adaptedParams: Record<string, number>
  success: boolean
}

export interface PlanningAdaptation {
  strategyType: string
  baseStrategy: object
  adaptedStrategy: object
  adaptationCost: number
  performanceGain: number
}
