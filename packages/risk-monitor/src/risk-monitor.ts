import { type RiskMetric, type RiskTrend } from './types'
import { createLogger } from '@ideia/logger';
import { type ActionEvent, RiskCollector } from './risk-collector'
import { AlertEngine } from './alert-engine'
import { RiskDashboard, type DashboardData } from './risk-dashboard'
import { TrendAnalyzer } from './trend-analyzer'
const logger = createLogger('risk-monitor');

export interface RiskMonitorConfig {
  checkIntervalMs: number
  trendWindowSize: number
  adaptiveThresholdEnabled: boolean
  alertCooldownMs: number
}

export const defaultRiskMonitorConfig: RiskMonitorConfig = {
  checkIntervalMs: 5000,
  trendWindowSize: 10,
  adaptiveThresholdEnabled: true,
  alertCooldownMs: 60000,
}

interface RunningAssessment {
  agentId: string
  lastScore: number
  trend: RiskTrend
  startedAt: number
}

export class RiskMonitor {
  private _assessments: Map<string, RunningAssessment> = new Map()
  private _riskHistory: Map<string, RiskMetric[]> = new Map()
  private _config: RiskMonitorConfig
  private _intervalId: ReturnType<typeof setInterval> | null = null
  private _running = false

  constructor(
    private _collector: RiskCollector,
    private _alertEngine: AlertEngine,
    private _dashboard: RiskDashboard,
    private _trendAnalyzer: TrendAnalyzer,
    config?: Partial<RiskMonitorConfig>
  ) {
    this._config = { ...defaultRiskMonitorConfig, ...config }
  }

  get config(): RiskMonitorConfig {
    return { ...this._config }
  }

  get collector(): RiskCollector {
    return this._collector
  }

  get alertEngine(): AlertEngine {
    return this._alertEngine
  }

  get dashboard(): RiskDashboard {
    return this._dashboard
  }

  get trendAnalyzer(): TrendAnalyzer {
    return this._trendAnalyzer
  }

  get isRunning(): boolean {
    return this._running
  }

  async start(): Promise<void> {
    this._running = true
    this._tick()
    this._intervalId = setInterval(() => { this._tick() }, this._config.checkIntervalMs)
  }

  stop(): void {
    this._running = false
    if (this._intervalId !== null) {
      clearInterval(this._intervalId)
      this._intervalId = null
    }
  }

  async onAction(action: ActionEvent): Promise<RiskMetric> {
    const metric = await this._collector.assess(action)
    this._collector.recordScore(action.agentId, metric.score)

    let history = this._riskHistory.get(action.agentId)
    if (history === undefined) {
      history = []
      this._riskHistory.set(action.agentId, history)
    }
    history.push(metric)
    if (history.length > 1000) {
      history.shift()
    }

    const trend = this._trendAnalyzer.analyze(history, this._config.trendWindowSize)
    const assessment: RunningAssessment = {
      agentId: action.agentId,
      lastScore: metric.score,
      trend,
      startedAt: Date.now(),
    }
    this._assessments.set(action.agentId, assessment)

    const metricWithTrend: RiskMetric = { ...metric, trend }
    const alerts = this._alertEngine.evaluate(action.agentId, metricWithTrend, history)
    this._dashboard.recordTimeSeries(action.agentId, {
      timestamp: Date.now(),
      value: metric.score,
      label: action.actionType,
    })

    void alerts

    return metricWithTrend
  }

  getAssessments(): Map<string, { lastScore: number; trend: RiskTrend }> {
    const result = new Map<string, { lastScore: number; trend: RiskTrend }>()
    for (const [id, a] of this._assessments) {
      result.set(id, { lastScore: a.lastScore, trend: a.trend })
    }
    return result
  }

  getRiskHistory(agentId: string): RiskMetric[] {
    return [...(this._riskHistory.get(agentId) ?? [])]
  }

  getDashboardData(): DashboardData {
    const alerts = this._alertEngine.getAllAlerts()
    return this._dashboard.aggregate(this.getAssessments(), alerts)
  }

  getAgentCount(): number {
    return this._assessments.size
  }

  private _tick(): void {
    if (!this._running) return
    for (const [agentId, assessment] of this._assessments) {
      const history = this._riskHistory.get(agentId) ?? []
      if (history.length === 0) continue
      const currentMetric = history[history.length - 1]
      const trend = this._trendAnalyzer.analyze(history, this._config.trendWindowSize)
      assessment.trend = trend
      assessment.lastScore = currentMetric.score

      if (trend === 'increasing' && currentMetric.score > 0.5) {
        const historyCopy = history
        void historyCopy
      }
    }
  }
}
