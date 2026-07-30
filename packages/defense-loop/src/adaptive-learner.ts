import { EventBus } from './types'
import { createLogger } from '@ideia/logger';
import { PolicyAdapter } from './policy-adapter'
import { DefenseCycleResult, AdaptationEvent, AdaptationMetrics } from './types'
const logger = createLogger('adaptive-learner');

export class AdaptiveLearner {
  private _adaptationHistory: AdaptationEvent[] = []
  private _learningRate = 0.1
  private _minConfidence = 0.6

  constructor(private _policyAdapter: PolicyAdapter, private _eventBus: EventBus) {}

  async learnFromCycle(cycle: DefenseCycleResult): Promise<void> {
    const adaptation: AdaptationEvent = {
      id: crypto.randomUUID(),
      attackType: cycle.scenario.type,
      ruleGenerated: cycle.rule.id,
      abTestPassed: cycle.abTestResult.passed,
      fpRate: cycle.fpRate,
      baselineFPRate: 0.01,
      improvement: 1 - cycle.fpRate,
      timestamp: Date.now(),
    }

    this._adaptationHistory.push(adaptation)

    if (cycle.status === 'active') {
      await this._adjustDetectors(cycle)
    }
  }

  private async _adjustDetectors(cycle: DefenseCycleResult): Promise<void> {
    const attackType: string = cycle.scenario.type
    const recentAdaptations: AdaptationEvent[] = this._adaptationHistory
      .filter(a => a.attackType === attackType).slice(-10)

    if (recentAdaptations.length < 3) return

    const avgImprovement: number = recentAdaptations.reduce((s, a) => s + a.improvement, 0) / recentAdaptations.length

    if (avgImprovement < this._minConfidence) {
      await this._policyAdapter.removeRule(cycle.rule.id)
      await this._eventBus.publish('security.defense.adaptive_adjustment', {
        attackType,
        reason: 'low_improvement',
        avgImprovement,
        ruleId: cycle.rule.id,
      })
    }
  }

  getAdaptationMetrics(): AdaptationMetrics {
    const total: number = this._adaptationHistory.length
    const successful: number = this._adaptationHistory.filter(a => a.fpRate < 0.01).length

    return {
      totalAdaptations: total,
      successfulAdaptations: successful,
      successRate: total > 0 ? successful / total : 0,
      averageFP: total > 0 ? this._adaptationHistory.reduce((s, a) => s + a.fpRate, 0) / total : 0,
      mostCommonAttack: this._getMostCommonAttack(),
      byType: this._getAdaptationsByType(),
    }
  }

  private _getMostCommonAttack(): string {
    const counts: Map<string, number> = new Map()
    for (const a of this._adaptationHistory) {
      counts.set(a.attackType, (counts.get(a.attackType) || 0) + 1)
    }
    return [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] || 'none'
  }

  private _getAdaptationsByType(): Record<string, number> {
    const byType: Record<string, number> = {}
    for (const a of this._adaptationHistory) {
      byType[a.attackType] = (byType[a.attackType] || 0) + 1
    }
    return byType
  }
}
