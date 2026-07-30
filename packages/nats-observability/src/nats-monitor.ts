import { createLogger } from '@ideia/logger'
import { StreamMetric, ConsumerLag, LatencyPercentile, NATSHealth, ObservabilityReport } from './types'

const logger = createLogger('nats-monitor')

export class NATSMonitor {
  private streams = new Map<string, StreamMetric>()
  private lags = new Map<string, ConsumerLag>()
  private latencyHistory: number[] = []

  addStream(metric: StreamMetric): void { this.streams.set(metric.name, metric) }
  updateStream(name: string, messages: number): void { const s = this.streams.get(name); if (s) { s.messages = messages; s.bytes += messages * 100 } }
  updateLag(consumerName: string, streamName: string, lag: number): void { this.lags.set(consumerName, { consumerName, streamName, lag, lastAck: new Date().toISOString(), pending: lag }) }
  recordLatency(ms: number): void { this.latencyHistory.push(ms); if (this.latencyHistory.length > 1000) this.latencyHistory.shift() }

  getHealth(): NATSHealth {
    const avgLatency = this.latencyHistory.length > 0 ? Math.round(this.latencyHistory.reduce((a, b) => a + b, 0) / this.latencyHistory.length) : 0
    return { connected: true, uptime: Date.now(), streams: this.streams.size, consumers: this.lags.size, avgLatency }
  }

  getLatencyPercentiles(): LatencyPercentile {
    const sorted = [...this.latencyHistory].sort((a, b) => a - b)
    const len = sorted.length
    if (len === 0) return { p50: 0, p95: 0, p99: 0, p999: 0 }
    return {
      p50: sorted[Math.floor(len * 0.5)] || 0,
      p95: sorted[Math.floor(len * 0.95)] || 0,
      p99: sorted[Math.floor(len * 0.99)] || 0,
      p999: sorted[Math.floor(len * 0.999)] || 0,
    }
  }

  generateReport(period: string): ObservabilityReport {
    const report: ObservabilityReport = {
      period,
      streams: [...this.streams.values()],
      consumerLags: [...this.lags.values()],
      dlqCount: [...this.lags.values()].filter(l => l.lag > 1000).length,
      latency: this.getLatencyPercentiles(),
      healthy: this.getHealth().connected,
    }
    logger.info(`Report generated`, { period, streams: report.streams.length, healthy: report.healthy })
    return report
  }
}
