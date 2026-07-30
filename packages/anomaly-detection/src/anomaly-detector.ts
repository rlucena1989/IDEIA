import { createLogger } from '@ideia/logger'
import { DataPoint, AnomalyResult, DetectionMethod, AnomalyType, Severity, DetectorConfig, DetectionReport } from './types'

const logger = createLogger('anomaly-detector')

const DEFAULT_CONFIG: DetectorConfig = { method: 'zscore', windowSize: 10, threshold: 2.5, minDataPoints: 5, sensitivity: 1 }

export class AnomalyDetector {
  private config: DetectorConfig
  private points: DataPoint[] = []
  private anomalyCounter = 0

  constructor(config?: Partial<DetectorConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config }
  }

  addPoint(point: DataPoint): void { this.points.push(point) }

  addPoints(points: DataPoint[]): void { this.points.push(...points) }

  detect(): AnomalyResult[] {
    if (this.points.length < this.config.minDataPoints) return []
    const results: AnomalyResult[] = []

    switch (this.config.method) {
      case 'zscore': results.push(...this.zscoreDetection()); break
      case 'mad': results.push(...this.madDetection()); break
      case 'iqr': results.push(...this.iqrDetection()); break
      case 'ewma': results.push(...this.ewmaDetection()); break
    }

    if (results.length > 0) logger.info(`Anomalies detected`, { count: results.length, method: this.config.method })
    return results
  }

  generateReport(period: string): DetectionReport {
    const anomalies = this.detect()
    const fpRate = this.points.length > 0 ? anomalies.filter(a => a.severity === 'info').length / this.points.length : 0
    return {
      period, totalPoints: this.points.length,
      anomaliesFound: anomalies.length,
      anomalies,
      falsePositiveRate: Math.round(fpRate * 100),
      recommendations: anomalies.length > 0 ? ['Review recent anomalies', 'Consider threshold adjustment'] : [],
    }
  }

  private zscoreDetection(): AnomalyResult[] {
    const results: AnomalyResult[] = []
    const values = this.points.map(p => p.value)
    const mean = values.reduce((s, v) => s + v, 0) / values.length
    const std = Math.sqrt(values.reduce((s, v) => s + Math.pow(v - mean, 2), 0) / values.length)

    if (std === 0) return []

    for (const point of this.points.slice(-this.config.windowSize)) {
      const z = Math.abs(point.value - mean) / std
      if (z > this.config.threshold) {
        results.push(this.createResult('spike', 'zscore', z, mean, point.value, point))
      }
    }
    return results
  }

  private madDetection(): AnomalyResult[] {
    const results: AnomalyResult[] = []
    const values = this.points.map(p => p.value)
    const median = this.median(values)
    const mad = this.median(values.map(v => Math.abs(v - median)))

    if (mad === 0) return []

    for (const point of this.points.slice(-this.config.windowSize)) {
      const deviation = Math.abs(point.value - median) / (mad * 1.4826)
      if (deviation > this.config.threshold) {
        results.push(this.createResult('spike', 'mad', deviation, median, point.value, point))
      }
    }
    return results
  }

  private iqrDetection(): AnomalyResult[] {
    const results: AnomalyResult[] = []
    const values = this.points.map(p => p.value).sort((a, b) => a - b)
    const q1 = values[Math.floor(values.length * 0.25)]
    const q3 = values[Math.floor(values.length * 0.75)]
    const iqr = q3 - q1
    const lower = q1 - 1.5 * iqr
    const upper = q3 + 1.5 * iqr

    for (const point of this.points.slice(-this.config.windowSize)) {
      if (point.value < lower || point.value > upper) {
        results.push(this.createResult('spike', 'iqr', (point.value - q3) / iqr, (q1 + q3) / 2, point.value, point))
      }
    }
    return results
  }

  private ewmaDetection(): AnomalyResult[] {
    const results: AnomalyResult[] = []
    const alpha = 0.3
    let ema = this.points[0]?.value ?? 0
    let emaVar = 0

    for (let i = 1; i < this.points.length; i++) {
      const residual = this.points[i].value - ema
      ema = alpha * this.points[i].value + (1 - alpha) * ema
      emaVar = alpha * Math.abs(residual) + (1 - alpha) * emaVar

      if (i >= this.points.length - this.config.windowSize && Math.abs(residual) > this.config.threshold * (emaVar || 1)) {
        results.push(this.createResult('trend-change', 'ewma', Math.abs(residual) / (emaVar || 1), ema, this.points[i].value, this.points[i]))
      }
    }
    return results
  }

  private createResult(type: AnomalyType, method: DetectionMethod, score: number, expected: number, actual: number, point: DataPoint): AnomalyResult {
    return {
      id: `anomaly-${this.anomalyCounter++}`,
      type, method, score: Math.round(score * 100) / 100,
      severity: score > this.config.threshold * 1.5 ? 'critical' as Severity : score > this.config.threshold ? 'warning' as Severity : 'info' as Severity,
      expectedValue: Math.round(expected * 100) / 100,
      actualValue: actual,
      deviation: Math.round(((actual - expected) / (expected || 1)) * 10000) / 100,
      timestamp: point.timestamp,
      description: `Anomaly detected: ${actual} vs expected ${Math.round(expected * 100) / 100} (${Math.round(score * 100) / 100} sigma)`,
    }
  }

  private median(values: number[]): number {
    const sorted = [...values].sort((a, b) => a - b)
    const mid = Math.floor(sorted.length / 2)
    return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid]
  }
}
