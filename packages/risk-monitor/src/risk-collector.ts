import { type RiskMetric, type RiskFactor, type RiskTrend, type RiskSource } from './types'
import { createLogger } from '@ideia/logger';
const logger = createLogger('risk-collector');

export interface ActionEvent {
  agentId: string
  actionType: string
  payload: string
  target: string
  timestamp: number
  tokenCost: number
  success: boolean
}

export class RiskCollector {
  private _sources: RiskSource[] = []
  private _agentScores: Map<string, number[]> = new Map()
  private _windowSize = 100
  private _weights: Record<string, number> = {
    shell_execute: 0.9,
    file_delete: 0.8,
    file_write: 0.5,
    network_connect: 0.7,
    file_read: 0.3,
    git_operation: 0.2,
    npm_install: 0.3,
    code_analysis: 0.1,
    file_search: 0.1,
  }

  registerSource(source: RiskSource): void {
    this._sources.push(source)
  }

  getSources(): RiskSource[] {
    return [...this._sources]
  }

  async assess(action: ActionEvent): Promise<RiskMetric> {
    const factors: RiskFactor[] = []

    const baseWeight = this._weights[action.actionType] ?? 0.2
    factors.push({ name: 'action_type', weight: 0.4, value: baseWeight, contribution: 0.4 * baseWeight })

    const tokenFactor = Math.min(1, action.tokenCost / 10000)
    factors.push({ name: 'token_cost', weight: 0.15, value: tokenFactor, contribution: 0.15 * tokenFactor })

    const targetFactor = this._assessTarget(action.target)
    factors.push({ name: 'target_sensitivity', weight: 0.25, value: targetFactor, contribution: 0.25 * targetFactor })

    const successFactor = action.success ? 0 : 0.3
    factors.push({ name: 'failure_indicator', weight: 0.1, value: successFactor, contribution: 0.1 * successFactor })

    const noveltyFactor = this._assessNovelty(action)
    factors.push({ name: 'novelty', weight: 0.1, value: noveltyFactor, contribution: 0.1 * noveltyFactor })

    const score = factors.reduce((s, f) => s + f.contribution, 0)

    return {
      agentId: action.agentId,
      score: Math.min(1, score),
      factors,
      timestamp: Date.now(),
      trend: 'stable',
    }
  }

  async collectFromSources(): Promise<RiskMetric[]> {
    const allMetrics: RiskMetric[] = []
    for (const source of this._sources) {
      if (!source.enabled) continue
      try {
        const metrics = await source.collect()
        allMetrics.push(...metrics)
      } catch {
        continue
      }
    }
    return allMetrics
  }

  recordScore(agentId: string, score: number): void {
    let scores = this._agentScores.get(agentId)
    if (scores === undefined) {
      scores = []
      this._agentScores.set(agentId, scores)
    }
    scores.push(score)
    if (scores.length > this._windowSize) {
      scores.shift()
    }
  }

  getMovingAverage(agentId: string, window = 10): number {
    const scores = this._agentScores.get(agentId)
    if (scores === undefined || scores.length === 0) return 0
    const recent = scores.slice(-window)
    return recent.reduce((s, v) => s + v, 0) / recent.length
  }

  getPercentile(agentId: string, percentile: number): number {
    const scores = this._agentScores.get(agentId)
    if (scores === undefined || scores.length === 0) return 0
    const sorted = [...scores].sort((a, b) => a - b)
    const index = Math.floor(sorted.length * percentile)
    return sorted[Math.min(index, sorted.length - 1)]
  }

  getScoreDistribution(agentId: string): Record<string, number> {
    const scores = this._agentScores.get(agentId) ?? []
    const total = scores.length || 1
    return {
      low: scores.filter(s => s <= 0.3).length / total,
      medium: scores.filter(s => s > 0.3 && s <= 0.6).length / total,
      high: scores.filter(s => s > 0.6 && s <= 0.8).length / total,
      critical: scores.filter(s => s > 0.8).length / total,
    }
  }

  updateWeight(actionType: string, weight: number): void {
    this._weights[actionType] = weight
  }

  private _assessTarget(target: string): number {
    const sensitive = ['.env', 'key.pem', 'credentials', 'secret', 'token', 'password']
    if (sensitive.some(s => target.includes(s))) return 1.0
    if (target.includes('/etc/') || target.includes('/usr/')) return 0.7
    if (target.includes('node_modules')) return 0.3
    return 0.1
  }

  private _assessNovelty(_action: ActionEvent): number {
    return 0.2
  }
}
