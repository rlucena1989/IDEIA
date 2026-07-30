import { type Alert, type AlertRule, type AlertSeverity, type AlertStatus, type RiskMetric } from './types'
import { createLogger } from '@ideia/logger';
const logger = createLogger('alert-engine');

export interface AlertThreshold {
  warning: number
  critical: number
  trendWarningDelta: number
  maxAlertsPerAgent: number
  alertCooldown: number
}

export interface AlertStats {
  total: number
  active: number
  bySeverity: { info: number; warning: number; critical: number }
}

export class AlertEngine {
  private _alerts: Alert[] = []
  private _rules: AlertRule[] = []
  private _thresholds: AlertThreshold
  private _adaptiveThresholds: Map<string, number> = new Map()
  private _alertCounter = 0

  constructor(thresholds?: Partial<AlertThreshold>) {
    this._thresholds = {
      warning: 0.3,
      critical: 0.6,
      trendWarningDelta: 0.15,
      maxAlertsPerAgent: 10,
      alertCooldown: 60000,
      ...thresholds,
    }
  }

  addRule(rule: AlertRule): void {
    this._rules.push(rule)
  }

  getRules(): AlertRule[] {
    return [...this._rules]
  }

  evaluate(agentId: string, metric: RiskMetric, history: RiskMetric[]): Alert[] {
    const alerts: Alert[] = []
    const now = Date.now()

    const cooldownActive = this._alerts
      .filter(a => a.agentId === agentId)
      .some(a => (now - a.timestamp) < this._thresholds.alertCooldown)
    if (cooldownActive) return []

    const activeCount = this._alerts
      .filter(a => a.agentId === agentId && a.status === 'active')
      .length
    if (activeCount >= this._thresholds.maxAlertsPerAgent) return []

    const adaptiveThreshold = this._adaptiveThresholds.get(agentId) ?? this._thresholds.critical

    if (metric.score >= this._thresholds.warning) {
      const isCritical = metric.score >= this._thresholds.critical
      const alert = this._createAlert(
        isCritical ? 'risk_escalated' : 'threshold_exceeded',
        agentId,
        isCritical ? 'critical' : 'warning',
        `Risk score ${(metric.score * 100).toFixed(0)}% exceeded ${isCritical ? 'critical' : 'warning'} threshold`,
        metric.score,
        isCritical ? adaptiveThreshold : this._thresholds.warning,
        now
      )
      alerts.push(alert)
    }

    if (metric.score >= adaptiveThreshold) {
      const existingEscalated = alerts.some(a => a.type === 'risk_escalated')
      if (!existingEscalated) {
        alerts.push(this._createAlert(
          'risk_escalated',
          agentId,
          'critical',
          `Risk score ${(metric.score * 100).toFixed(0)}% exceeded adaptive threshold`,
          metric.score,
          adaptiveThreshold,
          now
        ))
      }
    }

    if (metric.trend === 'increasing') {
      alerts.push(this._createAlert(
        'trend_warning',
        agentId,
        'warning',
        `Risk trend increasing for agent ${agentId}`,
        metric.score,
        this._thresholds.trendWarningDelta,
        now
      ))
    }

    const recentScores = history.slice(-5)
    if (recentScores.length >= 5) {
      const avg = recentScores.reduce((s, r) => s + r.score, 0) / 5
      if (avg >= this._thresholds.critical) {
        alerts.push(this._createAlert(
          'threshold_exceeded',
          agentId,
          'critical',
          `Sustained high risk: avg ${(avg * 100).toFixed(0)}% over 5 assessments`,
          avg,
          this._thresholds.critical,
          now
        ))
      }
    }

    for (const rule of this._rules) {
      try {
        if (rule.condition(metric)) {
          const ruleAlerts = this._alerts.filter(
            a => a.ruleId === rule.id && a.agentId === agentId && a.status === 'active'
          )
          if (ruleAlerts.length === 0) {
            alerts.push(this._createAlert(
              'risk_escalated',
              agentId,
              rule.severity,
              rule.message,
              metric.score,
              0,
              now,
              rule.id
            ))
          }
        }
      } catch {
        continue
      }
    }

    for (const alert of alerts) {
      this._alerts.push(alert)
    }

    return alerts
  }

  setAdaptiveThreshold(agentId: string, threshold: number): void {
    this._adaptiveThresholds.set(agentId, threshold)
  }

  acknowledge(alertId: string): boolean {
    const alert = this._alerts.find(a => a.id === alertId)
    if (alert !== undefined) {
      alert.status = 'acknowledged'
      alert.acknowledgedAt = Date.now()
      return true
    }
    return false
  }

  resolve(alertId: string): boolean {
    const alert = this._alerts.find(a => a.id === alertId)
    if (alert !== undefined) {
      alert.status = 'resolved'
      alert.resolvedAt = Date.now()
      return true
    }
    return false
  }

  getActiveAlerts(): Alert[] {
    return this._alerts.filter(a => a.status === 'active')
  }

  getAlertsByAgent(agentId: string): Alert[] {
    return this._alerts.filter(a => a.agentId === agentId)
  }

  getAllAlerts(): Alert[] {
    return [...this._alerts]
  }

  getAlertStats(): AlertStats {
    const active = this.getActiveAlerts()
    return {
      total: this._alerts.length,
      active: active.length,
      bySeverity: {
        info: active.filter(a => a.severity === 'info').length,
        warning: active.filter(a => a.severity === 'warning').length,
        critical: active.filter(a => a.severity === 'critical').length,
      },
    }
  }

  private _createAlert(
    type: Alert['type'],
    agentId: string,
    severity: AlertSeverity,
    message: string,
    score: number,
    threshold: number,
    timestamp: number,
    ruleId?: string
  ): Alert {
    this._alertCounter++
    return {
      id: `alert-${this._alertCounter}-${timestamp}`,
      ruleId: ruleId ?? 'built-in',
      type,
      agentId,
      severity,
      status: 'active' as AlertStatus,
      message,
      score,
      threshold,
      timestamp,
      acknowledgedAt: null,
      resolvedAt: null,
    }
  }
}
