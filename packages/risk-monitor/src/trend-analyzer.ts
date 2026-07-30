import { type RiskMetric, type RiskTrend } from './types'
import { createLogger } from '@ideia/logger';
const logger = createLogger('trend-analyzer');

export class TrendAnalyzer {
  analyze(history: RiskMetric[], windowSize = 10): RiskTrend {
    if (history.length < windowSize * 2) return 'stable'

    const recent = history.slice(-windowSize)
    const older = history.slice(-windowSize * 2, -windowSize)

    const recentAvg = recent.reduce((s, r) => s + r.score, 0) / windowSize
    const olderAvg = older.reduce((s, r) => s + r.score, 0) / windowSize

    const diff = recentAvg - olderAvg
    if (diff > 0.1) return 'increasing'
    if (diff < -0.1) return 'decreasing'
    return 'stable'
  }

  computeSlope(history: RiskMetric[], window = 20): number {
    const points = history.slice(-window)
    if (points.length < 2) return 0
    const n = points.length
    const sumX = points.reduce((s, _p, i) => s + i, 0)
    const sumY = points.reduce((s, p) => s + p.score, 0)
    const sumXY = points.reduce((s, p, i) => s + i * p.score, 0)
    const sumX2 = points.reduce((s, _p, i) => s + i * i, 0)
    const denominator = n * sumX2 - sumX * sumX
    if (denominator === 0) return 0
    return (n * sumXY - sumX * sumY) / denominator
  }

  movingAverage(history: RiskMetric[], window = 5): number[] {
    if (history.length === 0) return []
    const result: number[] = []
    for (let i = 0; i < history.length; i++) {
      const start = Math.max(0, i - window + 1)
      const count = i - start + 1
      const sum = 0
      for (let j = start; j <= i; j++) {
        result[result.length - 1] = (result[result.length - 1] || 0) + history[j].score
      }
    }
    const values: number[] = []
    for (let i = 0; i < history.length; i++) {
      const start = Math.max(0, i - window + 1)
      let sum = 0
      for (let j = start; j <= i; j++) {
        sum += history[j].score
      }
      values.push(sum / (i - start + 1))
    }
    return values
  }

  exponentialSmoothing(history: RiskMetric[], alpha = 0.3): number[] {
    if (history.length === 0) return []
    const result: number[] = [history[0].score]
    for (let i = 1; i < history.length; i++) {
      result.push(alpha * history[i].score + (1 - alpha) * result[i - 1])
    }
    return result
  }

  predict(history: RiskMetric[], steps = 5): number[] {
    const slope = this.computeSlope(history)
    const lastValue = history.length > 0 ? history[history.length - 1].score : 0
    return Array.from({ length: steps }, (_, i) =>
      Math.max(0, Math.min(1, lastValue + slope * (i + 1)))
    )
  }

  detectAnomaly(history: RiskMetric[], threshold = 2.5): { index: number; score: number; zScore: number } | null {
    if (history.length < 3) return null
    const last = history[history.length - 1]
    const rest = history.slice(0, -1)
    const mean = rest.reduce((s, r) => s + r.score, 0) / rest.length
    const variance = rest.reduce((s, r) => s + (r.score - mean) ** 2, 0) / rest.length
    const std = Math.sqrt(variance)
    if (std === 0) return null
    const zScore = (last.score - mean) / std
    if (Math.abs(zScore) > threshold) {
      return { index: history.length - 1, score: last.score, zScore }
    }
    return null
  }
}
