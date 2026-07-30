import { createLogger } from '@ideia/logger';
import {  type Alert,
  type DashboardConfig,
  type DashboardPanel,
  type RiskLevel,
  type RiskMetric,
  type RiskTrend,
  type TimeSeriesPoint,
} from './types'
const logger = createLogger('risk-dashboard');

export interface DashboardData {
  totalAgents: number
  byRiskLevel: Record<RiskLevel, number>
  avgRisk: number
  maxRisk: number
  trend: RiskTrend
  activeAlerts: number
  lastUpdated: number
}

export interface AgentSummary {
  agentId: string
  lastScore: number
  trend: RiskTrend
  category: RiskLevel
  alertCount: number
}

export class RiskDashboard {
  private _config: DashboardConfig
  private _panels: DashboardPanel[] = []
  private _timeSeriesCache: Map<string, TimeSeriesPoint[]> = new Map()
  private _lastData: DashboardData | null = null

  constructor(config?: Partial<DashboardConfig>) {
    this._config = {
      refreshIntervalMs: 5000,
      maxHistoryPoints: 1000,
      enabledPanels: ['gauge', 'chart', 'alert_list'],
      riskThresholds: { low: 0.3, medium: 0.6, high: 0.8 },
      ...config,
    }
  }

  get config(): DashboardConfig {
    return { ...this._config }
  }

  updateConfig(partial: Partial<DashboardConfig>): void {
    this._config = { ...this._config, ...partial }
  }

  addPanel(panel: DashboardPanel): void {
    this._panels.push(panel)
  }

  getPanels(): DashboardPanel[] {
    return [...this._panels]
  }

  aggregate(assessments: Map<string, { lastScore: number; trend: RiskTrend }>, alerts: Alert[]): DashboardData {
    const agents = Array.from(assessments.values())
    const byLevel: Record<RiskLevel, number> = { low: 0, medium: 0, high: 0, critical: 0 }

    for (const a of agents) {
      const level = this._classifyRisk(a.lastScore)
      byLevel[level]++
    }

    const totalScore = agents.reduce((s, a) => s + a.lastScore, 0)
    const avgRisk = agents.length > 0 ? totalScore / agents.length : 0
    const maxRisk = agents.length > 0 ? Math.max(...agents.map(a => a.lastScore)) : 0

    const allScores = agents.map(a => a.lastScore)
    const trend = this._computeTrend(allScores)

    const data: DashboardData = {
      totalAgents: agents.length,
      byRiskLevel: byLevel,
      avgRisk,
      maxRisk,
      trend,
      activeAlerts: alerts.filter(a => a.status === 'active').length,
      lastUpdated: Date.now(),
    }

    this._lastData = data
    return data
  }

  getLastData(): DashboardData | null {
    return this._lastData
  }

  recordTimeSeries(agentId: string, point: TimeSeriesPoint): void {
    let series = this._timeSeriesCache.get(agentId)
    if (series === undefined) {
      series = []
      this._timeSeriesCache.set(agentId, series)
    }
    series.push(point)
    if (series.length > this._config.maxHistoryPoints) {
      series.splice(0, series.length - this._config.maxHistoryPoints)
    }
  }

  getTimeSeries(agentId: string): TimeSeriesPoint[] {
    return [...(this._timeSeriesCache.get(agentId) ?? [])]
  }

  getAgentSummaries(assessments: Map<string, { lastScore: number; trend: RiskTrend }>, alerts: Alert[]): AgentSummary[] {
    const summaries: AgentSummary[] = []
    for (const [agentId, a] of assessments) {
      const agentAlerts = alerts.filter(al => al.agentId === agentId && al.status === 'active')
      summaries.push({
        agentId,
        lastScore: a.lastScore,
        trend: a.trend,
        category: this._classifyRisk(a.lastScore),
        alertCount: agentAlerts.length,
      })
    }
    return summaries.sort((x, y) => y.lastScore - x.lastScore)
  }

  private _classifyRisk(score: number): RiskLevel {
    if (score > this._config.riskThresholds.high) return 'critical'
    if (score > this._config.riskThresholds.medium) return 'high'
    if (score > this._config.riskThresholds.low) return 'medium'
    return 'low'
  }

  private _computeTrend(scores: number[]): RiskTrend {
    if (scores.length < 10) return 'stable'
    const recent = scores.slice(-10)
    const half = Math.floor(recent.length / 2)
    const firstHalf = recent.slice(0, half).reduce((s, v) => s + v, 0) / half
    const secondHalf = recent.slice(half).reduce((s, v) => s + v, 0) / half
    const diff = secondHalf - firstHalf
    return diff > 0.05 ? 'increasing' : diff < -0.05 ? 'decreasing' : 'stable'
  }
}
