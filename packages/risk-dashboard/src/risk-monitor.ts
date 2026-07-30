import { createLogger } from '@ideia/logger'
import { RiskMetric, SLODefinition, AlertRule, AlertEvent, DashboardData, RiskLevel, MetricType } from './types'

const logger = createLogger('risk-monitor')

export class RiskMonitor {
  private metrics = new Map<string, RiskMetric>()
  private slos: SLODefinition[] = []
  private rules: AlertRule[] = []
  private alerts: AlertEvent[] = []
  private alertCounter = 0

  addMetric(metric: RiskMetric): void { this.metrics.set(metric.id, metric) }

  updateMetric(id: string, value: number): RiskMetric | undefined {
    const metric = this.metrics.get(id)
    if (!metric) return undefined
    const prev = metric.currentValue
    metric.currentValue = value
    metric.trend = value > prev ? 'up' : value < prev ? 'down' : 'stable'
    metric.riskLevel = this.calculateRiskLevel(value, metric.threshold)
    metric.timestamp = new Date().toISOString()
    this.evaluateAlerts(metric)
    return metric
  }

  addSLO(slo: SLODefinition): void { this.slos.push(slo) }

  updateSLO(name: string, current: number): void {
    const slo = this.slos.find(s => s.name === name)
    if (slo) { slo.current = current; slo.burning = current < slo.target; slo.errorBudget = Math.max(0, current - slo.target) }
  }

  addRule(rule: AlertRule): void { this.rules.push(rule) }

  getDashboard(): DashboardData {
    const allMetrics = [...this.metrics.values()]
    const levels = allMetrics.map(m => m.riskLevel)
    const overallRisk: RiskLevel = levels.includes('critical') ? 'critical' : levels.includes('high') ? 'high' : levels.includes('medium') ? 'medium' : 'low'
    return { metrics: allMetrics, slos: [...this.slos], alerts: [...this.alerts].slice(-20), overallRisk, timestamp: new Date().toISOString() }
  }

  acknowledgeAlert(alertId: string): void {
    const alert = this.alerts.find(a => a.id === alertId)
    if (alert) alert.acknowledged = true
  }

  private evaluateAlerts(metric: RiskMetric): void {
    for (const rule of this.rules) {
      if (!rule.enabled || rule.metricId !== metric.id) continue
      let triggered = false
      switch (rule.condition) {
        case '>': triggered = metric.currentValue > rule.value; break
        case '<': triggered = metric.currentValue < rule.value; break
        case '==': triggered = metric.currentValue === rule.value; break
        case 'change': triggered = Math.abs(metric.currentValue - rule.value) > rule.value * 0.1; break
      }
      if (triggered) {
        this.alerts.push({
          id: `alert-${this.alertCounter++}`, ruleId: rule.id, metricId: metric.id,
          message: `${metric.name}: ${metric.currentValue} ${metric.unit} (threshold: ${rule.value})`,
          severity: rule.severity, timestamp: new Date().toISOString(), acknowledged: false,
        })
      }
    }
  }

  private calculateRiskLevel(value: number, threshold: number): RiskLevel {
    const ratio = threshold > 0 ? value / threshold : 0
    if (ratio >= 1.5) return 'critical'
    if (ratio >= 1.0) return 'high'
    if (ratio >= 0.7) return 'medium'
    return 'low'
  }
}
