import { RiskMonitor, defaultRiskMonitorConfig } from '../src/risk-monitor'
import { RiskCollector, type ActionEvent } from '../src/risk-collector'
import { AlertEngine, type AlertThreshold } from '../src/alert-engine'
import { RiskDashboard, type DashboardData } from '../src/risk-dashboard'
import { TrendAnalyzer } from '../src/trend-analyzer'
import { RiskSurfaceVisualizer, type AgentRiskPoint } from '../src/risk-surface-visualizer'
import { PredictiveRiskMonitor } from '../src/predictive-risk-monitor'
import { RiskCorrelationGraph, type RiskPropagationPath } from '../src/risk-correlation-graph'
import type { RiskMetric, RiskTrend, Alert, RiskNode, RiskEdge, DashboardConfig } from '../src/types'

function makeMetric(score: number, trend: RiskTrend = 'stable', agentId = 'test-agent'): RiskMetric {
  return {
    agentId,
    score,
    factors: [],
    timestamp: Date.now(),
    trend,
  }
}

function makeAction(overrides?: Partial<ActionEvent>): ActionEvent {
  return {
    agentId: 'test-agent',
    actionType: 'code_analysis',
    payload: 'safe analysis',
    target: '/home/src/index.ts',
    timestamp: Date.now(),
    tokenCost: 100,
    success: true,
    ...overrides,
  }
}

/* ─────────── RiskCollector ─────────── */
describe('RiskCollector', () => {
  let collector: RiskCollector

  beforeEach(() => {
    collector = new RiskCollector()
  })

  test('assess returns a metric with valid score range', async () => {
    const metric = await collector.assess(makeAction())
    expect(metric.score).toBeGreaterThanOrEqual(0)
    expect(metric.score).toBeLessThanOrEqual(1)
    expect(metric.factors.length).toBeGreaterThan(0)
    expect(metric.agentId).toBe('test-agent')
  })

  test('assess assigns higher score for dangerous actions', async () => {
    const safe = await collector.assess(makeAction({ actionType: 'file_search' }))
    const dangerous = await collector.assess(makeAction({ actionType: 'shell_execute' }))
    expect(dangerous.score).toBeGreaterThan(safe.score)
  })

  test('assess increases risk for sensitive targets', async () => {
    const normal = await collector.assess(makeAction({ target: '/home/file.ts' }))
    const sensitive = await collector.assess(makeAction({ target: '/etc/passwd/.env' }))
    expect(sensitive.score).toBeGreaterThan(normal.score)
  })

  test('recordScore maintains sliding window', () => {
    for (let i = 0; i < 200; i++) {
      collector.recordScore('test-agent', Math.random())
    }
    const ma = collector.getMovingAverage('test-agent', 10)
    expect(ma).toBeGreaterThan(0)
    expect(collector.getMovingAverage('unknown-agent')).toBe(0)
  })

  test('getPercentile returns correct values', () => {
    for (let i = 0; i < 100; i++) {
      collector.recordScore('test-agent', i / 100)
    }
    expect(collector.getPercentile('test-agent', 0.5)).toBeCloseTo(0.5, 0)
    expect(collector.getPercentile('test-agent', 0)).toBeCloseTo(0, 0)
  })

  test('getScoreDistribution returns normalized proportions', () => {
    for (let i = 0; i < 100; i++) {
      collector.recordScore('test-agent', i / 100)
    }
    const dist = collector.getScoreDistribution('test-agent')
    const total = dist.low + dist.medium + dist.high + dist.critical
    expect(total).toBeCloseTo(1, 1)
  })

  test('registerSource and collectFromSources works', async () => {
    let called = false
    collector.registerSource({
      name: 'test-source',
      weight: 1,
      enabled: true,
      async collect() {
        called = true
        return [makeMetric(0.5)]
      },
    })
    const metrics = await collector.collectFromSources()
    expect(called).toBe(true)
    expect(metrics.length).toBe(1)
  })

  test('updateWeight changes risk for action type', async () => {
    const before = await collector.assess(makeAction({ actionType: 'shell_execute' }))
    collector.updateWeight('shell_execute', 0.1)
    const after = await collector.assess(makeAction({ actionType: 'shell_execute' }))
    expect(after.score).toBeLessThan(before.score)
  })
})

/* ─────────── TrendAnalyzer ─────────── */
describe('TrendAnalyzer', () => {
  let analyzer: TrendAnalyzer

  beforeEach(() => {
    analyzer = new TrendAnalyzer()
  })

  test('returns stable for insufficient data', () => {
    expect(analyzer.analyze([makeMetric(0.5)])).toBe('stable')
  })

  test('detects increasing trend', () => {
    const history: RiskMetric[] = []
    for (let i = 0; i < 40; i++) {
      history.push(makeMetric(0.1 + i * 0.02))
    }
    expect(analyzer.analyze(history)).toBe('increasing')
  })

  test('detects decreasing trend', () => {
    const history: RiskMetric[] = []
    for (let i = 0; i < 40; i++) {
      history.push(makeMetric(0.9 - i * 0.02))
    }
    expect(analyzer.analyze(history)).toBe('decreasing')
  })

  test('computeSlope returns positive for increasing data', () => {
    const history: RiskMetric[] = []
    for (let i = 0; i < 30; i++) {
      history.push(makeMetric(0.2 + i * 0.01))
    }
    expect(analyzer.computeSlope(history)).toBeGreaterThan(0)
  })

  test('computeSlope returns zero for single point', () => {
    expect(analyzer.computeSlope([makeMetric(0.5)])).toBe(0)
  })

  test('movingAverage returns correct length', () => {
    const history: RiskMetric[] = []
    for (let i = 0; i < 10; i++) {
      history.push(makeMetric(0.5))
    }
    const ma = analyzer.movingAverage(history, 3)
    expect(ma.length).toBe(10)
  })

  test('exponentialSmoothing works', () => {
    const history: RiskMetric[] = []
    for (let i = 0; i < 10; i++) {
      history.push(makeMetric(0.5))
    }
    const smoothed = analyzer.exponentialSmoothing(history, 0.3)
    expect(smoothed.length).toBe(10)
    expect(smoothed[0]).toBe(0.5)
  })

  test('predict returns future values within [0,1]', () => {
    const history: RiskMetric[] = []
    for (let i = 0; i < 30; i++) {
      history.push(makeMetric(0.3 + i * 0.01))
    }
    const preds = analyzer.predict(history, 5)
    expect(preds.length).toBe(5)
    for (const p of preds) {
      expect(p).toBeGreaterThanOrEqual(0)
      expect(p).toBeLessThanOrEqual(1)
    }
  })

  test('detectAnomaly returns null for short history', () => {
    expect(analyzer.detectAnomaly([makeMetric(0.5)])).toBeNull()
  })

  test('detectAnomaly flags outlier', () => {
    const history: RiskMetric[] = []
    for (let i = 0; i < 10; i++) {
      history.push(makeMetric(0.3))
    }
    history.push(makeMetric(0.95))
    const result = analyzer.detectAnomaly(history, 2)
    expect(result).not.toBeNull()
    expect(result!.zScore).toBeGreaterThan(2)
  })
})

/* ─────────── AlertEngine ─────────── */
describe('AlertEngine', () => {
  let engine: AlertEngine

  beforeEach(() => {
    engine = new AlertEngine({ alertCooldown: 0 })
  })

  test('generates warning alert for score above threshold', () => {
    const metric = makeMetric(0.5)
    const alerts = engine.evaluate('test-agent', metric, [metric])
    expect(alerts.length).toBeGreaterThan(0)
    expect(alerts.some(a => a.severity === 'warning')).toBe(true)
  })

  test('generates critical alert for high score', () => {
    const metric = makeMetric(0.85)
    const alerts = engine.evaluate('test-agent', metric, [metric])
    expect(alerts.some(a => a.severity === 'critical')).toBe(true)
  })

  test('acknowledge marks alert as acknowledged', () => {
    const metric = makeMetric(0.7)
    const alerts = engine.evaluate('test-agent', metric, [metric])
    expect(alerts.length).toBeGreaterThan(0)
    const ok = engine.acknowledge(alerts[0].id)
    expect(ok).toBe(true)
    expect(engine.getActiveAlerts().length).toBe(0)
  })

  test('acknowledge returns false for unknown alert', () => {
    expect(engine.acknowledge('unknown')).toBe(false)
  })

  test('resolve marks alert as resolved', () => {
    const metric = makeMetric(0.7)
    const alerts = engine.evaluate('test-agent', metric, [metric])
    const ok = engine.resolve(alerts[0].id)
    expect(ok).toBe(true)
  })

  test('getAlertsByAgent filters correctly', () => {
    const m1 = makeMetric(0.7, 'stable', 'agent-a')
    const m2 = makeMetric(0.7, 'stable', 'agent-b')
    engine.evaluate('agent-a', m1, [m1])
    engine.evaluate('agent-b', m2, [m2])
    expect(engine.getAlertsByAgent('agent-a').length).toBeGreaterThan(0)
    expect(engine.getAlertsByAgent('nonexistent').length).toBe(0)
  })

  test('getAlertStats returns correct counts', () => {
    const metric = makeMetric(0.7)
    engine.evaluate('test-agent', metric, [metric])
    const stats = engine.getAlertStats()
    expect(stats.total).toBeGreaterThan(0)
    expect(stats.active).toBeGreaterThan(0)
  })

  test('respects cooldown period', () => {
    const cooldownEngine = new AlertEngine({ alertCooldown: 100000 })
    const metric = makeMetric(0.7)
    cooldownEngine.evaluate('test-agent', metric, [metric])
    const secondBatch = cooldownEngine.evaluate('test-agent', metric, [metric])
    expect(secondBatch.length).toBe(0)
  })

  test('evaluates custom rules', () => {
    let ruleFired = false
    engine.addRule({
      id: 'test-rule',
      name: 'Test Rule',
      severity: 'critical',
      message: 'Custom rule triggered',
      cooldownMs: 0,
      condition: (m: RiskMetric) => {
        if (m.score > 0.4) {
          ruleFired = true
          return true
        }
        return false
      },
    })
    const metric = makeMetric(0.5)
    engine.evaluate('test-agent', metric, [metric])
    expect(ruleFired).toBe(true)
  })

  test('setAdaptiveThreshold changes alert behavior', () => {
    engine.setAdaptiveThreshold('test-agent', 0.9)
    const metric = makeMetric(0.4)
    const alerts = engine.evaluate('test-agent', metric, [metric])
    const escalated = alerts.filter(a => a.type === 'risk_escalated')
    expect(escalated.length).toBe(0)
    expect(alerts.length).toBeGreaterThan(0)
  })
})

/* ─────────── RiskMonitor ─────────── */
describe('RiskMonitor', () => {
  let collector: RiskCollector
  let alertEngine: AlertEngine
  let dashboard: RiskDashboard
  let trendAnalyzer: TrendAnalyzer
  let monitor: RiskMonitor

  beforeEach(() => {
    collector = new RiskCollector()
    alertEngine = new AlertEngine()
    dashboard = new RiskDashboard()
    trendAnalyzer = new TrendAnalyzer()
    monitor = new RiskMonitor(collector, alertEngine, dashboard, trendAnalyzer)
  })

  test('default config is applied', () => {
    expect(monitor.config.checkIntervalMs).toBe(defaultRiskMonitorConfig.checkIntervalMs)
  })

  test('onAction returns a metric and stores history', async () => {
    const metric = await monitor.onAction(makeAction())
    expect(metric.score).toBeGreaterThanOrEqual(0)
    expect(metric.agentId).toBe('test-agent')
    expect(monitor.getAgentCount()).toBe(1)
  })

  test('getRiskHistory returns stored metrics', async () => {
    await monitor.onAction(makeAction({ actionType: 'file_search' }))
    await monitor.onAction(makeAction({ actionType: 'code_analysis' }))
    const history = monitor.getRiskHistory('test-agent')
    expect(history.length).toBe(2)
  })

  test('getDashboardData returns aggregated data', async () => {
    await monitor.onAction(makeAction())
    const data = monitor.getDashboardData()
    expect(data.totalAgents).toBe(1)
    expect(data.avgRisk).toBeGreaterThanOrEqual(0)
    expect(data.maxRisk).toBeGreaterThanOrEqual(0)
    expect(data.lastUpdated).toBeGreaterThan(0)
  })

  test('start and stop lifecycle works', async () => {
    expect(monitor.isRunning).toBe(false)
    await monitor.start()
    expect(monitor.isRunning).toBe(true)
    monitor.stop()
    expect(monitor.isRunning).toBe(false)
  })
})

/* ─────────── RiskDashboard ─────────── */
describe('RiskDashboard', () => {
  let dashboard: RiskDashboard

  beforeEach(() => {
    dashboard = new RiskDashboard()
  })

  test('aggregate returns valid dashboard data', () => {
    const assessments = new Map<string, { lastScore: number; trend: RiskTrend }>()
    assessments.set('agent-1', { lastScore: 0.2, trend: 'stable' })
    assessments.set('agent-2', { lastScore: 0.7, trend: 'increasing' })
    assessments.set('agent-3', { lastScore: 0.9, trend: 'increasing' })

    const data = dashboard.aggregate(assessments, [])
    expect(data.totalAgents).toBe(3)
    expect(data.avgRisk).toBeCloseTo(0.6, 1)
    expect(data.byRiskLevel.low).toBe(1)
    expect(data.byRiskLevel.high).toBe(1)
    expect(data.byRiskLevel.critical).toBe(1)
  })

  test('aggregate returns zeros for empty assessments', () => {
    const data = dashboard.aggregate(new Map(), [])
    expect(data.totalAgents).toBe(0)
    expect(data.avgRisk).toBe(0)
    expect(data.maxRisk).toBe(0)
  })

  test('getAgentSummaries sorts by score descending', () => {
    const assessments = new Map<string, { lastScore: number; trend: RiskTrend }>()
    assessments.set('low', { lastScore: 0.2, trend: 'decreasing' })
    assessments.set('high', { lastScore: 0.9, trend: 'increasing' })
    const summaries = dashboard.getAgentSummaries(assessments, [])
    expect(summaries[0].agentId).toBe('high')
    expect(summaries[1].agentId).toBe('low')
  })

  test('recordTimeSeries and getTimeSeries works', () => {
    dashboard.recordTimeSeries('agent-1', { timestamp: 1, value: 0.5, label: 'test' })
    dashboard.recordTimeSeries('agent-1', { timestamp: 2, value: 0.6, label: 'test' })
    const series = dashboard.getTimeSeries('agent-1')
    expect(series.length).toBe(2)
  })

  test('updateConfig changes configuration', () => {
    const prev = dashboard.config
    dashboard.updateConfig({ refreshIntervalMs: 10000 })
    expect(dashboard.config.refreshIntervalMs).toBe(10000)
    expect(prev.refreshIntervalMs).toBe(5000)
  })

  test('getLastData returns null before aggregation', () => {
    expect(dashboard.getLastData()).toBeNull()
  })

  test('getLastData returns data after aggregation', () => {
    const assessments = new Map<string, { lastScore: number; trend: RiskTrend }>()
    assessments.set('agent-1', { lastScore: 0.5, trend: 'stable' })
    dashboard.aggregate(assessments, [])
    expect(dashboard.getLastData()).not.toBeNull()
    expect(dashboard.getLastData()!.totalAgents).toBe(1)
  })
})

/* ─────────── RiskSurfaceVisualizer ─────────── */
describe('RiskSurfaceVisualizer', () => {
  let visualizer: RiskSurfaceVisualizer

  beforeEach(() => {
    visualizer = new RiskSurfaceVisualizer({ gridSize: 16, blurRadius: 0.2 })
  })

  test('generateMesh produces valid surface', () => {
    visualizer.addPoint({
      agentId: 'agent-1', actionType: 'shell_execute',
      x: 0.5, y: 0.5, riskScore: 0.8, trend: 'increasing', alertCount: 2,
    })
    visualizer.addPoint({
      agentId: 'agent-2', actionType: 'file_read',
      x: 0.3, y: 0.7, riskScore: 0.2, trend: 'stable', alertCount: 0,
    })
    const mesh = visualizer.generateMesh()
    expect(mesh.gridSize).toBe(16)
    expect(mesh.vertices.length).toBe(16 * 16 * 3)
    expect(mesh.indices.length).toBeGreaterThan(0)
    expect(mesh.colors.length).toBe(16 * 16 * 4)
  })

  test('generateMesh handles empty points', () => {
    const mesh = visualizer.generateMesh()
    expect(mesh.gridSize).toBe(16)
    expect(mesh.vertices.length).toBe(16 * 16 * 3)
  })

  test('getSurfaceStatistics returns zeros for no points', () => {
    const stats = visualizer.getSurfaceStatistics()
    expect(stats.minRisk).toBe(0)
    expect(stats.pointCount).toBe(0)
  })

  test('getSurfaceStatistics computes correctly', () => {
    visualizer.addPoint({
      agentId: 'a', actionType: 't', x: 0, y: 0, riskScore: 0.3, trend: 'stable', alertCount: 0,
    })
    visualizer.addPoint({
      agentId: 'b', actionType: 't', x: 0.5, y: 0.5, riskScore: 0.9, trend: 'increasing', alertCount: 1,
    })
    const stats = visualizer.getSurfaceStatistics()
    expect(stats.minRisk).toBe(0.3)
    expect(stats.maxRisk).toBe(0.9)
    expect(stats.avgRisk).toBeCloseTo(0.6, 1)
    expect(stats.pointCount).toBe(2)
  })

  test('getHeatmapGrid returns interpolated grid', () => {
    visualizer.addPoint({
      agentId: 'a', actionType: 't', x: 0.5, y: 0.5, riskScore: 1, trend: 'stable', alertCount: 0,
    })
    const grid = visualizer.getHeatmapGrid()
    expect(grid.length).toBe(16 * 16)
  })

  test('updateData replaces points', () => {
    visualizer.addPoint({
      agentId: 'a', actionType: 't', x: 0, y: 0, riskScore: 0.5, trend: 'stable', alertCount: 0,
    })
    expect(visualizer.getPointCount()).toBe(1)
    visualizer.updateData([])
    expect(visualizer.getPointCount()).toBe(0)
  })
})

/* ─────────── PredictiveRiskMonitor ─────────── */
describe('PredictiveRiskMonitor', () => {
  let predictor: PredictiveRiskMonitor

  beforeEach(() => {
    predictor = new PredictiveRiskMonitor({
      horizon: 1,
      steps: 5,
      changepointPriorScale: 0.5,
      seasonalityPriorScale: 5,
    })
  })

  test('requires at least 14 observations to fit', async () => {
    await expect(predictor.fit()).rejects.toThrow('Need at least 14 observations')
  })

  test('fit and predict produce forecast', async () => {
    const baseTime = Date.now() - 30 * 86400000
    for (let i = 0; i < 30; i++) {
      await predictor.addObservation(baseTime + i * 86400000, 0.3 + Math.sin(i * 0.5) * 0.2)
    }
    const result = await predictor.predict()
    expect(result.forecast.length).toBe(5)
    expect(result.trendDirection).toMatch(/^(up|down|stable)$/)
    expect(result.alertRecommendation).toBeTruthy()
  })

  test('forecast values produce valid structure', async () => {
    const baseTime = Date.now() - 30 * 86400000
    for (let i = 0; i < 30; i++) {
      await predictor.addObservation(baseTime + i * 86400000, 0.5)
    }
    const result = await predictor.predict()
    expect(result.forecast.length).toBe(5)
    expect(result.changePoints).toBeDefined()
    expect(result.seasonality.weekly.length).toBe(24)
    expect(result.seasonality.daily.length).toBe(24)
    expect(result.trendDirection).toMatch(/^(up|down|stable)$/)
    for (const f of result.forecast) {
      expect(typeof f.yhat).toBe('number')
      expect(Number.isFinite(f.yhat)).toBe(true)
      expect(typeof f.ds).toBe('number')
    }
  })

  test('getForecastAccuracy returns metrics', async () => {
    const baseTime = Date.now() - 30 * 86400000
    for (let i = 0; i < 30; i++) {
      await predictor.addObservation(baseTime + i * 86400000, 0.5)
    }
    await predictor.fit()
    const acc = predictor.getForecastAccuracy()
    expect(acc.mae).toBeGreaterThanOrEqual(0)
    expect(acc.rmse).toBeGreaterThanOrEqual(0)
    expect(acc.mape).toBeGreaterThanOrEqual(0)
  })

  test('addObservation limits history size', async () => {
    for (let i = 0; i < 12000; i++) {
      await predictor.addObservation(Date.now() + i, 0.5)
    }
    expect(predictor.history.length).toBeLessThanOrEqual(7000)
  })

  test('config is returned correctly', () => {
    const cfg = predictor.config
    expect(cfg.steps).toBe(5)
    expect(cfg.horizon).toBe(1)
  })
})

/* ─────────── RiskCorrelationGraph ─────────── */
describe('RiskCorrelationGraph', () => {
  let graph: RiskCorrelationGraph

  beforeEach(() => {
    graph = new RiskCorrelationGraph(0.05)
  })

  test('addNode and getNode work', () => {
    graph.addNode('agent-1', 'Agent 1', 'agent', 0.5)
    const node = graph.getNode('agent-1')
    expect(node).not.toBeUndefined()
    expect(node!.label).toBe('Agent 1')
    expect(node!.riskScore).toBe(0.5)
  })

  test('addEdge creates bidirectional link by default', () => {
    graph.addNode('a', 'A', 'agent', 0.5)
    graph.addNode('b', 'B', 'agent', 0.3)
    graph.addEdge('a', 'b', 0.8)
    expect(graph.getEdgeCount()).toBe(1)
    expect(graph.getNodeCount()).toBe(2)
  })

  test('learnCorrelations computes precision matrix', async () => {
    graph.addNode('x', 'X', 'agent', 0.5)
    graph.addNode('y', 'Y', 'agent', 0.5)
    graph.addNode('z', 'Z', 'agent', 0.5)

    const observations = [
      { x: 0.1, y: 0.2, z: 0.3 },
      { x: 0.4, y: 0.5, z: 0.6 },
      { x: 0.7, y: 0.8, z: 0.9 },
      { x: 0.2, y: 0.3, z: 0.4 },
      { x: 0.5, y: 0.6, z: 0.7 },
    ]

    await graph.learnCorrelations(observations)
    const corr = graph.getCorrelationMatrix()
    expect(corr.nodeIds.length).toBe(3)
    expect(corr.matrix.length).toBe(3)
  })

  test('computePageRank assigns ranks', () => {
    graph.addNode('a', 'A', 'agent', 0.5)
    graph.addNode('b', 'B', 'agent', 0.3)
    graph.addNode('c', 'C', 'agent', 0.7)
    graph.addEdge('a', 'b', 0.8)
    graph.addEdge('b', 'c', 0.6)
    graph.computePageRank()
    const nodeA = graph.getNode('a')
    const nodeB = graph.getNode('b')
    const nodeC = graph.getNode('c')
    expect(nodeA!.pageRank).toBeGreaterThan(0)
    expect(nodeB!.pageRank).toBeGreaterThan(0)
    expect(nodeC!.pageRank).toBeGreaterThan(0)
  })

  test('computeBetweennessCentrality calculates centrality', () => {
    graph.addNode('a', 'A', 'agent', 0.5)
    graph.addNode('b', 'B', 'agent', 0.3)
    graph.addNode('c', 'C', 'agent', 0.7)
    graph.addEdge('a', 'b', 0.8)
    graph.addEdge('b', 'c', 0.6)
    graph.computeBetweennessCentrality()
    const nodeB = graph.getNode('b')
    expect(nodeB!.betweenness).toBeGreaterThanOrEqual(0)
    expect(nodeB!.betweenness).toBeLessThanOrEqual(1)
  })

  test('detectCommunities groups nodes', () => {
    graph.addNode('a', 'A', 'agent', 0.5)
    graph.addNode('b', 'B', 'agent', 0.3)
    graph.addNode('c', 'C', 'agent', 0.7)
    graph.addEdge('a', 'b', 0.9)
    graph.addEdge('b', 'c', 0.1)
    graph.detectCommunities()
    const nodeA = graph.getNode('a')
    const nodeB = graph.getNode('b')
    expect(nodeA!.community).toBeGreaterThanOrEqual(0)
    expect(nodeB!.community).toBeGreaterThanOrEqual(0)
  })

  test('findPropagationPaths returns risk paths', () => {
    graph.addNode('source', 'Source', 'agent', 0.9)
    graph.addNode('middle', 'Middle', 'action', 0.5)
    graph.addNode('target', 'Target', 'system', 0.3)
    graph.addEdge('source', 'middle', 0.8)
    graph.addEdge('middle', 'target', 0.6)

    const paths = graph.findPropagationPaths('source', 3)
    expect(paths.length).toBeGreaterThan(0)
    expect(paths[0].hops).toBeGreaterThan(0)
    expect(paths[0].totalRisk).toBeGreaterThan(0)
  })

  test('getTopRiskNodes returns sorted by risk', () => {
    graph.addNode('low', 'Low', 'agent', 0.1)
    graph.addNode('high', 'High', 'agent', 0.9)
    graph.addNode('mid', 'Mid', 'agent', 0.5)
    const top = graph.getTopRiskNodes(2)
    expect(top.length).toBe(2)
    expect(top[0].id).toBe('high')
    expect(top[1].id).toBe('mid')
  })

  test('getGraphSummary returns correct metrics', () => {
    graph.addNode('a', 'A', 'agent', 0.5)
    graph.addNode('b', 'B', 'agent', 0.3)
    graph.addEdge('a', 'b', 0.8)
    graph.computePageRank()
    const summary = graph.getGraphSummary()
    expect(summary.nodeCount).toBe(2)
    expect(summary.edgeCount).toBe(1)
    expect(summary.density).toBeGreaterThan(0)
    expect(summary.avgRiskScore).toBe(0.4)
  })

  test('toJSON serializes correctly', () => {
    graph.addNode('a', 'A', 'agent', 0.5)
    graph.addEdge('a', 'a', 1, 'directed')
    const json = graph.toJSON()
    expect(json.nodes.length).toBe(1)
    expect(json.edges.length).toBe(1)
  })
})
