export type RiskLevel = 'low' | 'medium' | 'high' | 'critical'
export type MetricType = 'latency' | 'error-rate' | 'throughput' | 'coverage' | 'security'

export interface RiskMetric {
  id: string
  name: string
  type: MetricType
  currentValue: number
  threshold: number
  unit: string
  trend: 'up' | 'down' | 'stable'
  riskLevel: RiskLevel
  timestamp: string
}

export interface SLODefinition {
  name: string
  target: number
  window: string
  current: number
  burning: boolean
  errorBudget: number
}

export interface AlertRule {
  id: string
  name: string
  metricId: string
  condition: '>' | '<' | '==' | 'change'
  value: number
  severity: RiskLevel
  enabled: boolean
}

export interface AlertEvent {
  id: string
  ruleId: string
  metricId: string
  message: string
  severity: RiskLevel
  timestamp: string
  acknowledged: boolean
}

export interface DashboardData {
  metrics: RiskMetric[]
  slos: SLODefinition[]
  alerts: AlertEvent[]
  overallRisk: RiskLevel
  timestamp: string
}
