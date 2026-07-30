import { SLO_TARGETS } from './types.js'
import { createLogger } from '@ideia/logger';
import type { SloMetric, SloThreshold, SloStatus, SloResult, SloViolation, SloDashboard } from './types.js'

export class SloMonitor {
  private metrics: Map<string, SloMetric[]> = new Map()
  private violations: SloViolation[] = []
  private statusCache: Map<string, SloResult> = new Map()

  recordMetric(contract: string, metric: Partial<SloMetric>): void {
    const now = Date.now()
    const entry: SloMetric = {
      contract,
      timestamp: now,
      latencyP50: metric.latencyP50 ?? 0,
      latencyP95: metric.latencyP95 ?? 0,
      latencyP99: metric.latencyP99 ?? 0,
      availability: metric.availability ?? 100,
      throughput: metric.throughput ?? 0,
      errorRate: metric.errorRate ?? 0
    }

    const existing = this.metrics.get(contract) ?? []
    existing.push(entry)
    if (existing.length > 1000) existing.shift()
    this.metrics.set(contract, existing)

    const result = this.evaluate(contract, entry)
    this.statusCache.set(contract, result)
  }

  checkSLO(contract: string): SloResult {
    const cached = this.statusCache.get(contract)
    if (cached) return cached

    const recent = this.getRecentMetrics(contract)
    if (!recent) {
      return {
        contract,
        status: 'unknown',
        metrics: this.emptyMetric(contract),
        violations: [],
        lastChecked: Date.now()
      }
    }

    const result = this.evaluate(contract, recent)
    this.statusCache.set(contract, result)
    return result
  }

  getStatus(contract?: string): SloResult | Map<string, SloResult> {
    if (contract) return this.checkSLO(contract)
    const all = new Map<string, SloResult>()
    for (const c of Object.keys(SLO_TARGETS)) {
      all.set(c, this.checkSLO(c))
    }
    return all
  }

  getViolations(): SloViolation[] {
    return [...this.violations]
  }

  getDashboard(): SloDashboard {
    const results = new Map<string, SloResult>()
    for (const c of Object.keys(SLO_TARGETS)) {
      results.set(c, this.checkSLO(c))
    }

    const counts = { healthy: 0, warning: 0, violated: 0, degraded: 0, unknown: 0 }
    let totalAvail = 0

    for (const r of results.values()) {
      counts[r.status as keyof typeof counts]++
      totalAvail += r.metrics.availability
    }

    return {
      totalContracts: results.size,
      ...counts,
      overallAvailability: results.size > 0 ? totalAvail / results.size : 0,
      recentViolations: this.violations.slice(-20),
      contracts: Array.from(results.values()),
      generatedAt: Date.now()
    }
  }

  private evaluate(contract: string, metric: SloMetric): SloResult {
    const target = SLO_TARGETS[contract]
    if (!target) {
      return { contract, status: 'unknown', metrics: metric, violations: [], lastChecked: Date.now() }
    }

    const t = target.threshold
    const issues: string[] = []

    if (metric.latencyP50 > t.latencyP50Max) issues.push(`latencyP50 ${metric.latencyP50} > ${t.latencyP50Max}`)
    if (metric.latencyP95 > t.latencyP95Max) issues.push(`latencyP95 ${metric.latencyP95} > ${t.latencyP95Max}`)
    if (metric.latencyP99 > t.latencyP99Max) issues.push(`latencyP99 ${metric.latencyP99} > ${t.latencyP99Max}`)
    if (metric.availability < t.availabilityMin) issues.push(`availability ${metric.availability} < ${t.availabilityMin}`)
    if (metric.throughput < t.throughputMin) issues.push(`throughput ${metric.throughput} < ${t.throughputMin}`)
    if (metric.errorRate > t.errorRateMax) issues.push(`errorRate ${metric.errorRate} > ${t.errorRateMax}`)

    let status: SloStatus
    if (issues.length === 0) {
      status = 'healthy'
    } else {
      const criticals = issues.filter(i => i.startsWith('availability') || i.startsWith('errorRate'))
      if (criticals.length > 0) {
        status = 'violated'
      } else if (issues.length >= 3) {
        status = 'degraded'
      } else {
        status = 'warning'
      }
    }

    for (const issue of issues) {
      const parts = issue.split(' ')
      this.violations.push({
        contract,
        metric: parts[0],
        expected: parseFloat(parts[3]),
        actual: parseFloat(parts[1]),
        severity: target.severity,
        timestamp: Date.now(),
        message: issue
      })
    }

    if (this.violations.length > 500) this.violations.splice(0, this.violations.length - 500)

    return { contract, status, metrics: metric, violations: issues, lastChecked: Date.now() }
  }

  private getRecentMetrics(contract: string): SloMetric | undefined {
    const entries = this.metrics.get(contract)
    if (!entries || entries.length === 0) return undefined
    return entries[entries.length - 1]
  }

  private emptyMetric(contract: string): SloMetric {
    return { contract, timestamp: Date.now(), latencyP50: 0, latencyP95: 0, latencyP99: 0, availability: 100, throughput: 0, errorRate: 0 }
  }
}
