import { RiskMonitor } from '../risk-monitor'

describe('RiskMonitor', () => {
  let monitor: RiskMonitor
  beforeEach(() => { monitor = new RiskMonitor() })

  it('should add and update metrics', () => {
    monitor.addMetric({ id: 'latency', name: 'P95 Latency', type: 'latency' as const, currentValue: 150, threshold: 200, unit: 'ms', trend: 'stable' as const, riskLevel: 'low' as const, timestamp: '' })
    const updated = monitor.updateMetric('latency', 250)
    expect(updated!.riskLevel).toBe('high')
  })

  it('should track SLOs', () => {
    monitor.addSLO({ name: 'uptime', target: 99.9, window: '30d', current: 99.5, burning: true, errorBudget: 0 })
    monitor.updateSLO('uptime', 99.95)
    const dashboard = monitor.getDashboard()
    const slo = dashboard.slos.find(s => s.name === 'uptime')
    expect(slo!.current).toBe(99.95)
    expect(slo!.burning).toBe(false)
  })

  it('should evaluate alert rules', () => {
    monitor.addRule({ id: 'r1', name: 'High Latency', metricId: 'latency', condition: '>', value: 200, severity: 'high' as const, enabled: true })
    monitor.addMetric({ id: 'latency', name: 'P95', type: 'latency' as const, currentValue: 100, threshold: 200, unit: 'ms', trend: 'stable' as const, riskLevel: 'low' as const, timestamp: '' })
    monitor.updateMetric('latency', 300)
    const dashboard = monitor.getDashboard()
    expect(dashboard.alerts.length).toBeGreaterThan(0)
    expect(dashboard.alerts[0].severity).toBe('high')
  })

  it('should acknowledge alerts', () => {
    monitor.addRule({ id: 'r1', name: 'rule', metricId: 'm1', condition: '>', value: 0, severity: 'medium' as const, enabled: true })
    monitor.addMetric({ id: 'm1', name: 'm1', type: 'latency' as const, currentValue: 0, threshold: 1, unit: '', trend: 'stable' as const, riskLevel: 'low' as const, timestamp: '' })
    monitor.updateMetric('m1', 100)
    const db = monitor.getDashboard()
    monitor.acknowledgeAlert(db.alerts[0].id)
    expect(monitor.getDashboard().alerts[0].acknowledged).toBe(true)
  })

  it('should compute overall risk', () => {
    monitor.addMetric({ id: 'm1', name: 'm1', type: 'security' as const, currentValue: 90, threshold: 100, unit: '', trend: 'up' as const, riskLevel: 'low' as const, timestamp: '' })
    monitor.updateMetric('m1', 200)
    const dashboard = monitor.getDashboard()
    expect(dashboard.overallRisk).toBe('critical')
  })
})
