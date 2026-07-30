import { createLogger, type Logger } from '@ideia/logger'
import type { AttackScenario, EvolutionOptions, PopulationStats } from './types'
import type { MutationEngine } from './mutation-engine'
import type { EffectivenessEvaluator } from './effectiveness-evaluator'

export class GeneticEngine {
  private population: AttackScenario[] = []
  private generations = 50
  private mutationRate = 0.3
  private crossoverRate = 0.7
  private elitismCount = 2
  private tournamentSize = 3
  private logger: Logger

  constructor(
    private mutationEngine: MutationEngine,
    private evaluator: EffectivenessEvaluator
  ) {
    this.logger = createLogger('security-pipeline:genetic-engine')
  }

  async evolve(initialPopulation: AttackScenario[], options: EvolutionOptions = {}): Promise<AttackScenario[]> {
    this.population = [...initialPopulation]
    this.generations = options.generations || this.generations
    this.mutationRate = options.mutationRate ?? this.mutationRate
    this.crossoverRate = options.crossoverRate ?? this.crossoverRate

    for (let gen = 0; gen < this.generations; gen++) {
      const fitnessScores = await this.evaluatePopulation(this.population)
      const parents = this.tournamentSelection(this.population, fitnessScores)

      const offspring = this.crossover(parents)
      const mutated = await this.mutatePopulation(offspring)

      const elites = this.population
        .map((p, i) => ({ scenario: p, fitness: fitnessScores[i] }))
        .sort((a, b) => b.fitness - a.fitness)
        .slice(0, this.elitismCount)
        .map(e => e.scenario)

      this.population = [...elites, ...mutated].slice(0, this.population.length)

      const avgFitness = this.population.reduce((s, p) => s + (p.fitness || 0), 0) / this.population.length
      const maxFitness = Math.max(...this.population.map(p => p.fitness || 0))

      if (options.onGeneration) {
        options.onGeneration(gen, avgFitness, maxFitness, this.population.length)
      }

      if (gen % 10 === 0) {
        this.logger.info(`Generation ${gen}: avg=${avgFitness.toFixed(3)}, max=${maxFitness.toFixed(3)}, pop=${this.population.length}`)
      }

      if (maxFitness >= 0.95 && gen > 10) break
    }

    const finalScores = await this.evaluatePopulation(this.population)
    for (let i = 0; i < this.population.length; i++) {
      this.population[i].fitness = finalScores[i]
    }

    return this.population.sort((a, b) => (b.fitness || 0) - (a.fitness || 0))
  }

  private async evaluatePopulation(population: AttackScenario[]): Promise<number[]> {
    const scores = await Promise.all(
      population.map(scenario => this.evaluator.evaluate(scenario))
    )
    return scores.map(s => s.score)
  }

  private tournamentSelection(population: AttackScenario[], fitness: number[]): AttackScenario[] {
    const selected: AttackScenario[] = []

    while (selected.length < population.length) {
      const tournament: number[] = []
      for (let i = 0; i < this.tournamentSize; i++) {
        tournament.push(Math.floor(Math.random() * population.length))
      }

      let bestIdx = tournament[0]
      for (const idx of tournament) {
        if (fitness[idx] > fitness[bestIdx]) {
          bestIdx = idx
        }
      }

      selected.push({ ...population[bestIdx] })
    }

    return selected
  }

  private crossover(parents: AttackScenario[]): AttackScenario[] {
    const offspring: AttackScenario[] = []

    for (let i = 0; i < parents.length - 1; i += 2) {
      if (Math.random() < this.crossoverRate) {
        const parentA = parents[i]
        const parentB = parents[i + 1]
        const wordsA = parentA.payload.split(' ')
        const wordsB = parentB.payload.split(' ')

        if (wordsA.length < 3 || wordsB.length < 3) {
          offspring.push(parentA)
          continue
        }

        const crossoverPoint = Math.floor(Math.random() * Math.min(wordsA.length, wordsB.length))

        const childPayload = [
          ...wordsA.slice(0, crossoverPoint),
          ...wordsB.slice(crossoverPoint),
        ].join(' ')

        offspring.push({
          id: this.generateId(),
          name: `crossover:${parentA.name}+${parentB.name}`,
          payload: childPayload,
          target: parentA.target,
          tags: [...parentA.tags, ...parentB.tags, 'crossover'],
          parentId: parentA.id,
          generation: Math.max(parentA.generation, parentB.generation) + 1,
          metadata: {
            ...parentA.metadata,
            ...parentB.metadata,
            crossoverType: 'single_point',
            parentA: parentA.id,
            parentB: parentB.id,
          },
        })
      } else {
        offspring.push(parents[i])
      }
    }

    return offspring
  }

  private async mutatePopulation(population: AttackScenario[]): Promise<AttackScenario[]> {
    const mutated: AttackScenario[] = []

    for (const scenario of population) {
      if (Math.random() < this.mutationRate) {
        const mutants = await this.mutationEngine.mutate(scenario, { count: 1 })
        if (mutants.length > 0) {
          mutated.push(mutants[0])
        } else {
          mutated.push(scenario)
        }
      } else {
        mutated.push(scenario)
      }
    }

    return mutated
  }

  getPopulationStats(): PopulationStats {
    const fitnesses = this.population.map(p => p.fitness || 0)
    return {
      size: this.population.length,
      avgFitness: fitnesses.reduce((s, f) => s + f, 0) / fitnesses.length,
      maxFitness: Math.max(...fitnesses),
      minFitness: Math.min(...fitnesses),
      diversity: this.computeDiversity(),
    }
  }

  private computeDiversity(): number {
    const payloads = this.population.map(p => p.payload)
    const unique = new Set(payloads)
    return unique.size / payloads.length
  }

  private generateId(): string {
    return `g_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`
  }
}
