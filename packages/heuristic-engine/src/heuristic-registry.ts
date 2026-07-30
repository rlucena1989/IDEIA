import { GraphHeuristic, DomainHeuristic, AStarSearch, DeveloperSpeedHeuristic, FileAccessCostHeuristic } from './astar-search'
import { createLogger } from '@ideia/logger';
import { ConstraintSatisfaction } from './constraint-satisfaction'
import { OptimizationEngine } from './optimization'
const logger = createLogger('heuristic-registry');

export type HeuristicType = 'astar' | 'genetic' | 'simulated_annealing' | 'constraint_satisfaction' | 'greedy' | 'hybrid'

export interface HeuristicDescriptor {
  name: string
  type: HeuristicType
  description: string
  complexity: string
  optimal: boolean
}

export class HeuristicRegistry {
  private _solvers = new Map<string, { type: HeuristicType; instance: unknown }>()

  constructor() {
    this._registerDefaults()
  }

  register(name: string, type: HeuristicType, instance: unknown): void {
    this._solvers.set(name, { type, instance })
  }

  getSolver<T>(name: string): T | undefined {
    return this._solvers.get(name)?.instance as T | undefined
  }

  listHeuristics(): HeuristicDescriptor[] {
    const descriptors: Record<string, HeuristicDescriptor> = {
      'A*': { name: 'A*', type: 'astar', description: 'Optimal pathfinding with admissible heuristic', complexity: 'O(b^d)', optimal: true },
      'Genetic Algorithm': { name: 'Genetic Algorithm', type: 'genetic', description: 'Evolutionary optimization via selection, crossover, mutation', complexity: 'O(pop×gen)', optimal: false },
      'Simulated Annealing': { name: 'Simulated Annealing', type: 'simulated_annealing', description: 'Probabilistic optimization with cooling schedule', complexity: 'O(k×n)', optimal: false },
      'Constraint Satisfaction': { name: 'Constraint Satisfaction', type: 'constraint_satisfaction', description: 'Find solutions satisfying all constraints', complexity: 'O(n!)', optimal: true },
      'Greedy Best-First': { name: 'Greedy Best-First', type: 'greedy', description: 'Fast beam-search with heuristic guidance', complexity: 'O(b×m)', optimal: false },
    }
    return Object.values(descriptors)
  }

  createAStar(): AStarSearch {
    const heuristic = new GraphHeuristic()
    heuristic.add(new DeveloperSpeedHeuristic())
    heuristic.add(new FileAccessCostHeuristic())
    return new AStarSearch(heuristic)
  }

  createConstraintSatisfaction(): ConstraintSatisfaction {
    return new ConstraintSatisfaction()
  }

  createOptimizationEngine(): OptimizationEngine {
    return new OptimizationEngine()
  }

  private _registerDefaults(): void {
    this.register('astar', 'astar', this.createAStar())
    this.register('constraint_satisfaction', 'constraint_satisfaction', this.createConstraintSatisfaction())
    this.register('optimization_engine', 'hybrid', this.createOptimizationEngine())
  }
}
