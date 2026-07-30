import { createLogger, type Logger } from '@ideia/logger'
import type { AttackScenario, MutationStrategy, MutationOptions, MutationRecord, StrategyStats, MutationStats } from './types'

export class MutationEngine {
  private strategies: MutationStrategy[] = []
  private mutationHistory: MutationRecord[] = []
  private logger: Logger

  constructor() {
    this.logger = createLogger('security-pipeline:mutation-engine')
  }

  registerStrategy(strategy: MutationStrategy): void {
    this.strategies.push(strategy)
    this.logger.info(`Registered mutation strategy: ${strategy.name}`)
  }

  async mutate(scenario: AttackScenario, options: MutationOptions = {}): Promise<AttackScenario[]> {
    const { strategies = this.strategies, count = 10, intensity = 0.5 } = options
    const results: AttackScenario[] = []
    const selectedStrategies = this.selectStrategies(strategies, count)

    for (const strategy of selectedStrategies) {
      try {
        const mutated = await strategy.mutate(scenario, intensity)
        mutated.parentId = scenario.id
        mutated.generation = scenario.generation + 1
        mutated.id = this.generateId()

        const evaluation = this.evaluateScenario(mutated)
        mutated.fitness = evaluation.score
        mutated.metadata.evaluation = evaluation

        results.push(mutated)

        this.mutationHistory.push({
          parentId: scenario.id,
          childId: mutated.id,
          strategy: strategy.name,
          intensity,
          fitness: evaluation.score,
          timestamp: Date.now(),
        })
      } catch (error) {
        this.logger.error(`Mutation failed for strategy ${strategy.name}: ${String(error)}`)
      }
    }

    return results
  }

  async batchMutate(scenarios: AttackScenario[], options: MutationOptions = {}): Promise<AttackScenario[]> {
    const allResults: AttackScenario[] = []
    for (const scenario of scenarios) {
      const results = await this.mutate(scenario, options)
      allResults.push(...results)
    }
    return allResults
  }

  async mutateWithStrategy(scenario: AttackScenario, strategyName: string, intensity = 0.5): Promise<AttackScenario | null> {
    const strategy = this.strategies.find(s => s.name === strategyName)
    if (!strategy) {
      this.logger.warn(`Strategy not found: ${strategyName}`)
      return null
    }
    const mutated = await strategy.mutate(scenario, intensity)
    mutated.parentId = scenario.id
    mutated.generation = scenario.generation + 1
    mutated.id = this.generateId()

    const evaluation = this.evaluateScenario(mutated)
    mutated.fitness = evaluation.score

    return mutated
  }

  getRegisteredStrategies(): string[] {
    return this.strategies.map(s => s.name)
  }

  getHistory(): MutationRecord[] {
    return [...this.mutationHistory]
  }

  getStrategyStats(): Record<string, { count: number; avgFitness: number }> {
    const stats: Record<string, StrategyStats> = {}

    for (const record of this.mutationHistory) {
      if (!stats[record.strategy]) {
        stats[record.strategy] = { count: 0, avgFitness: 0, totalFitness: 0 }
      }
      stats[record.strategy].count++
      stats[record.strategy].totalFitness += record.fitness
      stats[record.strategy].avgFitness = stats[record.strategy].totalFitness / stats[record.strategy].count
    }

    const result: Record<string, { count: number; avgFitness: number }> = {}
    for (const [key, val] of Object.entries(stats)) {
      result[key] = { count: val.count, avgFitness: val.avgFitness }
    }
    return result
  }

  getMutationStats(): MutationStats {
    const breakdown = this.getStrategyStats()
    const entries = Object.entries(breakdown)
    const totalMutations = entries.reduce((s, [, v]) => s + v.count, 0)
    const successfulMutations = this.mutationHistory.filter(r => r.fitness > 0).length
    const successRate = totalMutations > 0 ? successfulMutations / totalMutations : 0
    const averageFitness = totalMutations > 0
      ? this.mutationHistory.reduce((s, r) => s + r.fitness, 0) / totalMutations
      : 0
    const topStrategy = entries.sort(([, a], [, b]) => b.avgFitness - a.avgFitness)[0]?.[0] || ''

    return {
      totalMutations,
      successRate,
      averageFitness,
      topStrategy,
      strategyBreakdown: breakdown,
    }
  }

  private selectStrategies(strategies: MutationStrategy[], count: number): MutationStrategy[] {
    const selected: MutationStrategy[] = []
    const pool = [...strategies]

    for (let i = 0; i < count && pool.length > 0; i++) {
      const idx = Math.floor(Math.random() * pool.length)
      selected.push(pool.splice(idx, 1)[0])
    }

    return selected
  }

  private generateId(): string {
    return `m_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`
  }

  private evaluateScenario(scenario: AttackScenario): { score: number; blocked: boolean } {
    const keywords = ['ignore', 'override', 'bypass', 'system', 'admin']
    const matches = keywords.filter(k => scenario.payload.toLowerCase().includes(k)).length
    const score = Math.min(1, matches / keywords.length)
    return { score, blocked: score < 0.3 }
  }
}
