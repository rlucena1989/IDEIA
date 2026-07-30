import { createLogger } from '@ideia/logger'
import { QualityMetric, ThresholdConfig, AdaptationResult, DriftSignal } from './types'

const logger = createLogger('threshold-adapter')

export class ThresholdAdapter {
  private history: QualityMetric[] = []
  private configs: Map<string, ThresholdConfig> = new Map()

  addConfig(config: ThresholdConfig): void { this.configs.set(config.metric, config) }

  record(metric: QualityMetric): void {
    this.history.push(metric)
    if (this.history.length > 1000) this.history.shift()
  }

  adapt(metricName: string): AdaptationResult | null {
    const config = this.configs.get(metricName)
    if (!config) return null

    const recent = this.history.filter(m => m.name === metricName).slice(-20)
    if (recent.length < 5) return null

    const avg = recent.reduce((s, m) => s + m.value, 0) / recent.length
    const oldThreshold = config.initial
    let newThreshold = oldThreshold
    let reason = ''

    if (avg > oldThreshold * 1.1) {
      newThreshold = Math.min(config.max, oldThreshold * (1 + config.adaptationRate))
      reason = `Values averaging ${Math.round(avg)} exceed threshold ${oldThreshold}`
    } else if (avg < oldThreshold * 0.9) {
      newThreshold = Math.max(config.min, oldThreshold * (1 - config.adaptationRate))
      reason = `Values averaging ${Math.round(avg)} below threshold ${oldThreshold}`
    } else {
      return null
    }

    config.initial = newThreshold
    logger.info(`Threshold adapted`, { metric: metricName, oldThreshold, newThreshold, reason })
    return { metric: metricName, oldThreshold, newThreshold: Math.round(newThreshold * 100) / 100, reason, confidence: recent.length > 10 ? 0.85 : 0.6 }
  }

  detectDrift(metricName: string): DriftSignal | null {
    const config = this.configs.get(metricName)
    if (!config || this.history.length < 10) return null

    const values = this.history.filter(m => m.name === metricName).map(m => m.value)
    if (values.length < 10) return null

    const baseline = values.slice(0, 5).reduce((s, v) => s + v, 0) / 5
    const recent = values.slice(-5).reduce((s, v) => s + v, 0) / 5
    const deviation = Math.abs(recent - baseline) / (baseline || 1)

    return { metric: metricName, currentAvg: Math.round(recent * 100) / 100, baselineAvg: Math.round(baseline * 100) / 100, deviation: Math.round(deviation * 100) / 100, driftDetected: deviation > 0.2 }
  }
}
