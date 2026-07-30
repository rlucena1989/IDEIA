export type RiskLevel = 'low' | 'medium' | 'high' | 'critical'
export type RiskTrend = 'increasing' | 'decreasing' | 'stable'
export type AlertSeverity = 'info' | 'warning' | 'critical'
export type AlertStatus = 'active' | 'acknowledged' | 'resolved'

export interface RiskMetric {
  agentId: string
  score: number
  factors: RiskFactor[]
  timestamp: number
  trend: RiskTrend
}

export interface RiskFactor {
  name: string
  weight: number
  value: number
  contribution: number
}

export interface RiskSource {
  name: string
  weight: number
  enabled: boolean
  collect(): Promise<RiskMetric[]>
}

export interface AlertRule {
  id: string
  name: string
  condition: (metric: RiskMetric) => boolean
  severity: AlertSeverity
  message: string
  cooldownMs: number
}

export interface Alert {
  id: string
  ruleId: string
  type: 'threshold_exceeded' | 'trend_warning' | 'anomaly_detected' | 'risk_escalated'
  agentId: string
  severity: AlertSeverity
  status: AlertStatus
  message: string
  score: number
  threshold: number
  timestamp: number
  acknowledgedAt: number | null
  resolvedAt: number | null
}

export interface DashboardConfig {
  refreshIntervalMs: number
  maxHistoryPoints: number
  enabledPanels: string[]
  riskThresholds: { low: number; medium: number; high: number }
}

export interface DashboardPanel {
  id: string
  title: string
  type: 'gauge' | 'chart' | 'table' | 'heatmap' | 'alert_list'
  data: Record<string, unknown>
}

export interface TimeSeriesPoint {
  timestamp: number
  value: number
  label: string
}

export interface RiskSurface {
  gridSize: number
  vertices: Float64Array
  colors: Float32Array
  indices: Uint32Array
  normals: Float32Array
}

export interface RiskNode {
  id: string
  label: string
  type: 'agent' | 'action' | 'system'
  riskScore: number
  pageRank: number
  betweenness: number
  community: number
}

export interface RiskEdge {
  source: string
  target: string
  weight: number
  partialCorrelation: number
  direction: 'bidirectional' | 'directed'
}

export interface CorrelationMatrix {
  nodeIds: string[]
  matrix: number[][]
}

export interface ForecastConfig {
  horizon: number
  steps: number
  seasonalityMode: 'additive' | 'multiplicative'
  weeklySeasonality: boolean
  dailySeasonality: boolean
  changepointPriorScale: number
  seasonalityPriorScale: number
}

export interface ForecastPoint {
  ds: number
  yhat: number
  yhatLower: number
  yhatUpper: number
  trend: number
  weekly: number
  daily: number
  holiday: number
  changepoint: boolean
}

export interface ForecastResult {
  forecast: ForecastPoint[]
  changePoints: number[]
  seasonality: { weekly: number[]; daily: number[] }
  trendDirection: 'up' | 'down' | 'stable'
  nextPeak: ForecastPoint | null
  alertRecommendation: string
}

export interface ProphetModel {
  trend: number[]
  seasonalityWeekly: number[]
  seasonalityDaily: number[]
  holiday: Map<string, number>
  sigma: number
}
