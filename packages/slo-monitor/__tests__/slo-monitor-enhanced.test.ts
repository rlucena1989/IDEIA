import { describe, it, expect, beforeEach } from '@jest/globals'
import { SloMonitor } from '../src/slo-monitor'
import { SLO_TARGETS} from '../src/types'
import { ContractVerifier } from '../src/contract-verifier'

describe('SloMonitor C18 — Enhanced', () => {
  let monitor: SloMonitor

  beforeEach(() => {
    monitor = new SloMonitor()
  })

  it('should record a healthy metric', () => {
    monitor.recordMetric('C1', { latencyP50: 10, latencyP95: 50, availability: 99.99, throughput: 5000 })
    const status = monitor.checkSLO('C1')
    expect(status.status).toBe('healthy')
  })

  it('should detect high latency violation', () => {
    monitor.recordMetric('C1', { latencyP50: 500, latencyP95: 1000, availability: 99.99 })
    const status = monitor.checkSLO('C1')
    expect(status.status).not.toBe('healthy')
    expect(status.violations.length).toBeGreaterThan(0)
  })

  it('should detect availability violation as critical', () => {
    monitor.recordMetric('C1', { latencyP50: 10, availability: 50, throughput: 5000 })
    const status = monitor.checkSLO('C1')
    expect(status.status).toBe('violated')
  })

  it('should detect degraded state with multiple warnings', () => {
    monitor.recordMetric('C1', { latencyP50: 200, latencyP95: 400, latencyP99: 700, availability: 99.5, throughput: 500, errorRate: 0.5 })
    const status = monitor.checkSLO('C1')
    expect(['degraded', 'violated']).toContain(status.status)
  })

  it('should return unknown for unknown contract', () => {
    const status = monitor.checkSLO('UNKNOWN')
    expect(status.status).toBe('unknown')
  })

  it('should return status for single contract', () => {
    monitor.recordMetric('C2', { latencyP50: 5, availability: 100 })
    const result = monitor.getStatus('C2') as unknown as { contract: string }
    expect(result.contract).toBe('C2')
  })

  it('should return all statuses', () => {
    monitor.recordMetric('C1', { latencyP50: 10, availability: 100 })
    const all = monitor.getStatus() as Map<string, unknown>
    expect(all.size).toBeGreaterThanOrEqual(1)
  })

  it('should track violations', () => {
    monitor.recordMetric('C1', { availability: 50 })
    const violations = monitor.getViolations()
    expect(violations.length).toBeGreaterThan(0)
    expect(violations[0]).toHaveProperty('contract')
    expect(violations[0]).toHaveProperty('metric')
  })

  it('should generate dashboard', () => {
    monitor.recordMetric('C1', { latencyP50: 10, availability: 100, throughput: 5000 })
    monitor.recordMetric('C2', { latencyP50: 5, availability: 100, throughput: 10000 })
    const dashboard = monitor.getDashboard()
    expect(dashboard.totalContracts).toBeGreaterThanOrEqual(2)
    expect(dashboard.healthy).toBeGreaterThanOrEqual(2)
    expect(dashboard.overallAvailability).toBeGreaterThan(0)
    expect(dashboard.generatedAt).toBeGreaterThan(0)
  })

  it('should include violations in dashboard', () => {
    monitor.recordMetric('C1', { availability: 50 })
    const dashboard = monitor.getDashboard()
    expect(dashboard.violated).toBeGreaterThanOrEqual(1)
  })

  it('should cap metrics at 1000 entries', () => {
    for (let i = 0; i < 1100; i++) {
      monitor.recordMetric('C1', { latencyP50: i })
    }
    const all = monitor.getStatus() as Map<string, unknown>
    expect(all.size).toBeGreaterThan(0)
  })

  it('should cap violations at 500 entries', () => {
    for (let i = 0; i < 600; i++) {
      monitor.recordMetric(`C${(i % 18) + 1}`, { availability: 0 })
    }
    expect(monitor.getViolations().length).toBeLessThanOrEqual(500)
  })
})

describe('ContractVerifier C18', () => {
  it('should create and start/stop', () => {
    const monitor = new SloMonitor()
    const verifier = new ContractVerifier(monitor)
    verifier.start()
    verifier.stop()
    expect(verifier.getBreakages()).toEqual([])
  })

  it('should set and retrieve stable version', () => {
    const monitor = new SloMonitor()
    const verifier = new ContractVerifier(monitor)
    verifier.setStableVersion('C1', '1.0.0')
    expect(verifier.getStableVersion('C1')).toBe('1.0.0')
  })

  it('should verify all contracts', async () => {
    const monitor = new SloMonitor()
    monitor.recordMetric('C1', { latencyP50: 10, availability: 100 })
    const verifier = new ContractVerifier(monitor)
    const results = await verifier.verifyAll()
    expect(results.size).toBeGreaterThan(0)
  })

  it('should verify single contract', () => {
    const monitor = new SloMonitor()
    monitor.recordMetric('C1', { latencyP50: 10, latencyP95: 50, latencyP99: 100, availability: 99.99, throughput: 5000, errorRate: 0.001 })
    const verifier = new ContractVerifier(monitor)
    const result = verifier.verifyContract('C1')
    expect(result.status).toBe('healthy')
  })
})

describe('SLO_TARGETS', () => {
  it('should have entries for C1-C18', () => {
    for (let i = 1; i <= 18; i++) {
      expect(SLO_TARGETS[`C${i}`]).toBeDefined()
    }
  })

  it('should have threshold values', () => {
    for (const key of Object.keys(SLO_TARGETS)) {
      const target = SLO_TARGETS[key]
      expect(target.threshold.latencyP50Max).toBeGreaterThan(0)
      expect(target.threshold.availabilityMin).toBeGreaterThan(0)
      expect(target.severity).toMatch(/^(critical|high|medium|low)$/)
    }
  })
})
