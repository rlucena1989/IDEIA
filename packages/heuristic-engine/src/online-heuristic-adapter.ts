import { NeuralGuidedSearch } from './neural-guided-search'
import { createLogger } from '@ideia/logger';
import { HyperHeuristicSelector } from './hyper-heuristic-selector'
const logger = createLogger('online-heuristic-adapter');

export interface AdaptationConfig {
  adaptationRate: number
  windowSize: number
  minSamplesBeforeAdapt: number
}

export class OnlineHeuristicAdapter {
  private _history: Array<{ taskType: string; heuristicUsed: string; timeMs: number; success: boolean; timestamp: number }> = []

  constructor(
    private _neuralSearch: NeuralGuidedSearch,
    private _hyperSelector: HyperHeuristicSelector,
    private _config: AdaptationConfig = { adaptationRate: 0.1, windowSize: 100, minSamplesBeforeAdapt: 10 },
  ) {}

  recordExecution(taskType: string, heuristicUsed: string, timeMs: number, success: boolean): void {
    this._history.push({ taskType, heuristicUsed, timeMs, success, timestamp: Date.now() })
    if (this._history.length > this._config.windowSize * 2) {
      this._history = this._history.slice(-this._config.windowSize)
    }
    this._neuralSearch.learnPattern({ taskType, complexity: this._estimateComplexity(taskType) }, heuristicUsed, success ? 1 / Math.max(1, timeMs) : -0.5)
    this._hyperSelector.recordOutcome(heuristicUsed, success, timeMs)
  }

  adapt(taskType: string, problemSize: number, timeBudgetMs: number): string {
    const recent = this._history.filter(h => h.taskType === taskType && Date.now() - h.timestamp < 3600000)

    if (recent.length >= this._config.minSamplesBeforeAdapt) {
      const neuralActions = ['A*', 'Genetic Algorithm', 'Simulated Annealing', 'Greedy Best-First', 'Constraint Satisfaction']
      const neuralResult = this._neuralSearch.selectBestAction({ taskType, complexity: this._estimateComplexity(taskType) }, neuralActions)
      if (neuralResult && neuralResult.length > 0) return neuralResult
    }

    return this._hyperSelector.select(taskType, problemSize, timeBudgetMs)
  }

  getAdaptationSummary(): { totalExecutions: number; taskTypes: string[]; bestPerformer: string | null } {
    const taskTypes = [...new Set(this._history.map(h => h.taskType))]
    const perf = new Map<string, { success: number; total: number }>()
    for (const h of this._history) {
      const p = perf.get(h.heuristicUsed) || { success: 0, total: 0 }
      p.total++
      if (h.success) p.success++
      perf.set(h.heuristicUsed, p)
    }
    let bestPerformer: string | null = null
    let bestRate = 0
    for (const [name, p] of perf) {
      const rate = p.total > 0 ? p.success / p.total : 0
      if (rate > bestRate) { bestRate = rate; bestPerformer = name }
    }
    return { totalExecutions: this._history.length, taskTypes, bestPerformer }
  }

  private _estimateComplexity(taskType: string): number {
    const complexityMap: Record<string, number> = {
      trivial: 0.1, simple: 0.3, moderate: 0.5, complex: 0.7, critical: 0.9,
    }
    return complexityMap[taskType] ?? 0.5
  }
}
