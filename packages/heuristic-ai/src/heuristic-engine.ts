import { createLogger } from '@ideia/logger'
import { HeuristicRule, HeuristicScore, DecisionContext, DecisionResult, HeuristicOptimization } from './types'

const logger = createLogger('heuristic-engine')

const DEFAULT_RULES: HeuristicRule[] = [
  { id: 'H1', name: 'Prefer simpler solutions', condition: 'complexity', weight: 0.8, category: 'design', enabled: true },
  { id: 'H2', name: 'Favor established patterns', condition: 'pattern', weight: 0.6, category: 'architecture', enabled: true },
  { id: 'H3', name: 'Minimize external dependencies', condition: 'dependency', weight: 0.5, category: 'architecture', enabled: true },
  { id: 'H4', name: 'Prioritize testability', condition: 'testability', weight: 0.7, category: 'quality', enabled: true },
  { id: 'H5', name: 'Consider security first', condition: 'security', weight: 0.9, category: 'security', enabled: true },
]

export class HeuristicEngine {
  private rules: HeuristicRule[]

  constructor(rules?: HeuristicRule[]) {
    this.rules = rules ?? DEFAULT_RULES
  }

  evaluate(context: DecisionContext): DecisionResult {
    const scores: HeuristicScore[] = this.rules.filter(r => r.enabled).map(rule => {
      const value = (context.input[rule.condition] as number) ?? 0.5
      const score = value * rule.weight
      return { ruleId: rule.id, score: Math.round(score * 100) / 100, confidence: rule.weight, reasoning: `Rule ${rule.name} applied with weight ${rule.weight}` }
    })

    scores.sort((a, b) => b.score - a.score)
    const totalScore = scores.reduce((s, sc) => s + sc.score, 0)
    const avgConfidence = scores.reduce((s, sc) => s + sc.confidence, 0) / Math.max(scores.length, 1)

    logger.info(`Heuristic evaluation complete`, { rules: scores.length, topScore: scores[0]?.score })
    return {
      decision: scores[0]?.ruleId ?? 'H0',
      score: Math.round(totalScore * 100) / 100,
      confidence: Math.round(avgConfidence * 100) / 100,
      topRules: scores.slice(0, 3),
      alternatives: scores.slice(1, 3).map(s => s.ruleId),
    }
  }

  addRule(rule: HeuristicRule): void { this.rules.push(rule) }
  getRules(): HeuristicRule[] { return [...this.rules] }
  enableRule(id: string, enabled: boolean): void { const r = this.rules.find(r => r.id === id); if (r) r.enabled = enabled }

  optimize(ruleId: string, performance: number): HeuristicOptimization {
    const rule = this.rules.find(r => r.id === ruleId)
    if (!rule) throw new Error(`Rule ${ruleId} not found`)
    const before = rule.weight
    rule.weight = Math.min(1, Math.max(0, rule.weight + (performance - 0.5) * 0.1))
    return { ruleId, beforeWeight: before, afterWeight: Math.round(rule.weight * 100) / 100, performanceGain: Math.round((rule.weight - before) * 100) }
  }
}
