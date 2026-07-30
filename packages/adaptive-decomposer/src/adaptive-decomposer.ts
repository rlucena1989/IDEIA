import { createLogger } from '@ideia/logger'
import { DecomposableTask, SubTask, DecompositionStrategy, DecompositionResult, StrategyPerformance } from './types'

const logger = createLogger('adaptive-decomposer')

const STRATEGIES: DecompositionStrategy[] = [
  { name: 'top-down', depth: 3, branching: 2, adaptive: false, description: 'Decompose from goal to primitives' },
  { name: 'bottom-up', depth: 2, branching: 4, adaptive: false, description: 'Compose from known primitives' },
  { name: 'agile', depth: 2, branching: 3, adaptive: true, description: 'Just-in-time decomposition' },
  { name: 'waterfall', depth: 5, branching: 3, adaptive: false, description: 'Full upfront decomposition' },
]

export class AdaptiveDecomposer {
  private performance: Map<string, StrategyPerformance> = new Map()
  private strategies: DecompositionStrategy[]

  constructor(strategies?: DecompositionStrategy[]) {
    this.strategies = strategies ?? STRATEGIES
    for (const s of this.strategies) {
      this.performance.set(s.name, { strategyName: s.name, avgQuality: 0.5, avgDuration: 100, useCount: 0, successRate: 0.5 })
    }
  }

  decompose(task: DecomposableTask): DecompositionResult {
    const start = Date.now()
    const strategy = this.selectStrategy(task)
    const subtasks = this.generateSubtasks(task, strategy)
    const quality = this.evaluateQuality(subtasks, task)

    const perf = this.performance.get(strategy.name)!
    perf.useCount++
    perf.avgQuality = (perf.avgQuality * (perf.useCount - 1) + quality) / perf.useCount
    perf.avgDuration = (perf.avgDuration * (perf.useCount - 1) + (Date.now() - start)) / perf.useCount
    perf.successRate = quality > 0.6 ? (perf.successRate * (perf.useCount - 1) + 1) / perf.useCount : (perf.successRate * (perf.useCount - 1)) / perf.useCount

    logger.info(`Decomposition complete`, { task: task.id, strategy: strategy.name, subtasks: subtasks.length, quality })
    return { taskId: task.id, strategy: strategy.name, subtasks, quality: Math.round(quality * 100) / 100, durationMs: Date.now() - start }
  }

  getPerformance(): StrategyPerformance[] { return [...this.performance.values()] }

  getBestStrategy(): DecompositionStrategy {
    return [...this.performance.values()]
      .filter(p => p.useCount > 0)
      .sort((a, b) => b.avgQuality - a.avgQuality)
      .map(p => this.strategies.find(s => s.name === p.strategyName)!)
      [0] ?? this.strategies[0]
  }

  private selectStrategy(task: DecomposableTask): DecompositionStrategy {
    const best = this.getBestStrategy()
    if (best.adaptive || this.performance.get(best.name)?.useCount === 0) return best
    if (task.complexity > 0.7) return this.strategies.find(s => s.name === 'waterfall') ?? best
    if (task.complexity < 0.3) return this.strategies.find(s => s.name === 'agile') ?? best
    return best
  }

  private generateSubtasks(task: DecomposableTask, strategy: DecompositionStrategy): SubTask[] {
    const subtasks: SubTask[] = []
    let counter = 0
    for (let level = 0; level < strategy.depth; level++) {
      for (let i = 0; i < strategy.branching; i++) {
        counter++
        subtasks.push({
          id: `sub-${task.id}-${counter}`, parentId: task.id,
          description: `${task.description} - step ${counter}`,
          estimatedEffort: Math.floor(task.complexity * 100 * (1 + level * 0.5)),
          dependencies: counter > strategy.branching ? [`sub-${task.id}-${counter - strategy.branching}`] : [],
          completed: false,
        })
      }
    }
    return subtasks
  }

  private evaluateQuality(subtasks: SubTask[], task: DecomposableTask): number {
    if (subtasks.length === 0) return 0
    const hasDeps = subtasks.some(s => s.dependencies.length > 0)
    const effortSpread = Math.max(...subtasks.map(s => s.estimatedEffort)) - Math.min(...subtasks.map(s => s.estimatedEffort))
    let score = 0.5
    if (hasDeps) score += 0.2
    if (effortSpread < 50) score += 0.15
    if (subtasks.length > 3) score += 0.15
    return Math.min(score, 1)
  }
}
