import { createLogger } from '@ideia/logger'
import { Task, TaskComplexity, DecompositionResult, StrategyType, RLState, RLAction, RLExperience, PlanningStrategy, OptimizationResult } from './types'

const logger = createLogger('neural-decomposition')

const STRATEGIES: PlanningStrategy[] = [
  { type: 'top-down', name: 'Top-Down', description: 'Break down from high-level goal', expectedEfficiency: 0.75 },
  { type: 'bottom-up', name: 'Bottom-Up', description: 'Start with known primitives', expectedEfficiency: 0.65 },
  { type: 'hybrid', name: 'Hybrid', description: 'Combine top-down and bottom-up', expectedEfficiency: 0.85 },
  { type: 'rl-optimized', name: 'RL-Optimized', description: 'Use RL to find optimal decomposition', expectedEfficiency: 0.9 },
]

export class DecompositionEngine {
  private experiences: RLExperience[] = []

  decompose(description: string, complexity: TaskComplexity): DecompositionResult {
    const strategy = this.selectStrategy(description)
    const depth = this.calculateDepth(complexity)
    const subtasks = this.generateSubtasks(description, complexity, depth, strategy)

    const result: DecompositionResult = {
      originalTask: description,
      subtasks,
      depth,
      totalSubtasks: this.countSubtasks(subtasks),
      strategy,
      qualityScore: this.calculateQuality(subtasks),
    }

    logger.info(`Decomposition complete`, { task: description.slice(0, 50), subtasks: result.totalSubtasks, strategy })
    return result
  }

  calculateRLReward(state: RLState, action: RLAction, nextState: RLState): number {
    let reward = 0
    if (nextState.remainingSubtasks < state.remainingSubtasks) reward += 10
    if (nextState.tokensUsed < state.tokensUsed) reward += 5
    if (nextState.quality > state.quality) reward += 8
    if (action.type === 'skip' && nextState.remainingSubtasks === state.remainingSubtasks) reward -= 5
    return reward
  }

  selectOptimalAction(state: RLState): RLAction {
    const actions: RLAction[] = [
      { type: 'decompose', target: state.taskId, expectedReward: state.remainingSubtasks > 3 ? 8 : 3 },
      { type: 'execute', target: state.taskId, expectedReward: state.remainingSubtasks <= 3 ? 10 : 2 },
      { type: 'merge', target: state.taskId, expectedReward: state.remainingSubtasks > 5 ? 6 : 1 },
    ]
    return actions.reduce((best, a) => a.expectedReward > best.expectedReward ? a : best)
  }

  optimize(taskId: string, description: string, complexity: TaskComplexity): OptimizationResult {
    const before = this.estimateCost(description, 'top-down')
    const strategy = this.selectStrategy(description)
    const after = this.estimateCost(description, strategy)

    return {
      taskId,
      originalCost: before,
      optimizedCost: after,
      savingsPercent: before > 0 ? Math.round(((before - after) / before) * 100) : 0,
      strategyUsed: strategy,
      recommendations: [
        strategy === 'rl-optimized' ? 'Use RL policy for future tasks of similar complexity' : 'Consider RL-based optimization for complex tasks',
        'Log decomposition quality metrics for continuous improvement',
      ],
    }
  }

  getStrategies(): PlanningStrategy[] {
    return [...STRATEGIES]
  }

  getExperiences(): RLExperience[] {
    return [...this.experiences]
  }

  private selectStrategy(description: string): StrategyType {
    const complexity = this.classifyComplexity(description)
    if (complexity === 'very-complex') return 'rl-optimized'
    if (complexity === 'complex') return 'hybrid'
    return 'top-down'
  }

  private classifyComplexity(description: string): TaskComplexity {
    const words = description.split(/\s+/).length
    if (words > 30) return 'very-complex'
    if (words > 15) return 'complex'
    if (words > 8) return 'moderate'
    return 'simple'
  }

  private calculateDepth(complexity: TaskComplexity): number {
    return { simple: 1, moderate: 2, complex: 3, 'very-complex': 4 }[complexity] || 2
  }

  private generateSubtasks(description: string, complexity: TaskComplexity, depth: number, strategy: StrategyType): Task[] {
    const subtasks: Task[] = []
    const lines = description.split(/[.!?]+/).filter(l => l.trim().length > 0)
    for (let i = 0; i < Math.min(lines.length, depth * 2); i++) {
      subtasks.push({
        id: `sub-${i + 1}`,
        description: lines[i].trim(),
        complexity: i === 0 ? complexity : 'moderate',
        subtasks: [],
        estimatedTokens: 50 + i * 25,
        dependencies: i > 0 ? [`sub-${i}`] : [],
      })
    }
    if (subtasks.length === 0) {
      subtasks.push({ id: 'sub-1', description, complexity, subtasks: [], estimatedTokens: 100, dependencies: [] })
    }
    return subtasks
  }

  private countSubtasks(tasks: Task[]): number {
    let count = 0
    for (const t of tasks) {
      count += 1 + this.countSubtasks(t.subtasks)
    }
    return count
  }

  private calculateQuality(subtasks: Task[]): number {
    if (subtasks.length === 0) return 0
    const hasDeps = subtasks.some(t => t.dependencies.length > 0)
    const avgTokens = subtasks.reduce((s, t) => s + t.estimatedTokens, 0) / subtasks.length
    let score = 50
    if (hasDeps) score += 20
    if (avgTokens > 0 && avgTokens < 200) score += 15
    if (subtasks.length > 1) score += 15
    return Math.min(score, 100)
  }

  private estimateCost(description: string, strategy: StrategyType): number {
    const strategyEff = STRATEGIES.find(s => s.type === strategy)?.expectedEfficiency || 0.7
    const base = description.split(/\s+/).length * 100
    return Math.round(base / strategyEff)
  }
}
