import { NATSMonitor } from '../nats-monitor'

describe('NATSMonitor', () => {
  let monitor: NATSMonitor
  beforeEach(() => { monitor = new NATSMonitor() })

  it('should track stream metrics', () => {
    monitor.addStream({ name: 'events', messages: 1000, bytes: 50000, consumers: 3, discards: 0, maxAge: 3600 })
    monitor.updateStream('events', 500)
    const report = monitor.generateReport('2026-07')
    expect(report.streams.length).toBe(1)
    expect(report.streams[0].messages).toBe(500)
  })

  it('should track consumer lag', () => {
    monitor.updateLag('consumer-1', 'events', 50)
    const report = monitor.generateReport('2026-07')
    expect(report.consumerLags.length).toBe(1)
    expect(report.consumerLags[0].lag).toBe(50)
  })

  it('should calculate latency percentiles', () => {
    for (let i = 1; i <= 100; i++) monitor.recordLatency(i)
    const p = monitor.getLatencyPercentiles()
    expect(p.p50).toBeGreaterThan(0)
    expect(p.p99).toBeGreaterThan(p.p50)
  })

  it('should report health', () => {
    const health = monitor.getHealth()
    expect(health.connected).toBe(true)
    expect(health.streams).toBe(0)
  })
})
