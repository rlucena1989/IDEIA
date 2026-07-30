import { HeuristicRegistry, HeuristicType } from './heuristic-registry'
import { createLogger } from '@ideia/logger';
const logger = createLogger('hyper-heuristic-selector');

interface HeuristicPerformanceRecord {
  heuristicName: string
  successes: number
  failures: number
  avgTimeMs: number
  lastUsed: number
}

export class HyperHeuristicSelector {
  private _records = new Map<string, HeuristicPerformanceRecord>()
  private _learningRate = 0.1

  constructor(private _registry: HeuristicRegistry) {}

  select(taskType: string, problemSize: number, timeBudgetMs: number): string {
    const candidates = this._getCandidates(taskType, problemSize)

    if (candidates.length === 0) return 'A*'

    const scored = candidates.map(name => {
      const record = this._records.get(name)
      if (!record) return { name, score: 0.5 }

      const total = record.successes + record.failures
      const successRate = total > 0 ? record.successes / total : 0.5
      const timeScore = record.avgTimeMs > 0 ? Math.min(1, timeBudgetMs / record.avgTimeMs) : 1
      const recencyScore = Math.min(1, (Date.now() - record.lastUsed) / 86400000)

      return {
        name,
        score: successRate * 0.5 + timeScore * 0.3 + recencyScore * 0.2,
      }
    })

    scored.sort((a, b) => b.score - a.score)
    return scored[0].name
  }

  recordOutcome(heuristicName: string, success: boolean, timeMs: number): void {
    const existing = this._records.get(heuristicName) || { heuristicName, successes: 0, failures: 0, avgTimeMs: 0, lastUsed: 0 }
    if (success) existing.successes++
    else existing.failures++
    existing.avgTimeMs = existing.avgTimeMs * (1 - this._learningRate) + timeMs * this._learningRate
    existing.lastUsed = Date.now()
    this._records.set(heuristicName, existing)
  }

  getPerformanceReport(): Array<{ heuristicName: string; successRate: number; avgTimeMs: number }> {
    return Array.from(this._records.values()).map(r => ({
      heuristicName: r.heuristicName,
      successRate: r.successes + r.failures > 0 ? r.successes / (r.successes + r.failures) : 0,
      avgTimeMs: r.avgTimeMs,
    }))
  }

  private _getCandidates(taskType: string, problemSize: number): string[] {
    const all = this._registry.listHeuristics()
    if (problemSize <= 5) {
      return all.filter(h => h.optimal).map(h => h.name)
    }
    if (taskType === 'scheduling' || taskType === 'planning') {
      return ['A*', 'Greedy Best-First', 'Genetic Algorithm']
    }
    if (taskType === 'optimization') {
      return ['Simulated Annealing', 'Genetic Algorithm']
    }
    if (taskType === 'allocation') {
      return ['Constraint Satisfaction', 'Genetic Algorithm']
    }
    return all.map(h => h.name)
  }
}
