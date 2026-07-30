import { EventBus } from '@ideia/event-bus';
import { ControlTower } from '@ideia/control-tower';
import { createLogger } from '@ideia/logger';
import {
  HealthData,
  MetricsSummary,
  EvolutionDataPoint,
  TechRecommendation,
  AutoAdrSummary,
  ActivityEntry,
  MetricCard,
  AutonomyLevelCard,
  ChartConfig,
} from './types';

const _log = createLogger('dashboard-service');

export class DashboardService {
  private evolutionData: EvolutionDataPoint[] = [];
  private activities: ActivityEntry[] = [];

  constructor(
    private eventBus?: EventBus,
    private controlTower?: ControlTower,
  ) {
    if (this.eventBus) {
      this.eventBus.subscribe('self-optimization.evolution', (event) => {
        const point = event.payload as EvolutionDataPoint;
        if (point?.timestamp) {
          this.evolutionData.push(point);
          if (this.evolutionData.length > 1000) this.evolutionData.shift();
        }
      });
    }
  }

  getHealth(): HealthData {
    const status = this.controlTower?.getStatus();
    const health = status?.healthPercent ?? 85;
    const categories: Record<string, number> = {
      system: health,
      autonomy: status?.autonomyLevel === 'autonomous' ? 90 : 70,
      safety: status?.activeTriggers ? Math.max(0, 100 - status.activeTriggers * 15) : 95,
    };
    return {
      overall: health,
      trend: this.computeTrend(),
      categories,
    };
  }

  getMetrics(): MetricsSummary {
    return {
      gapCount: { open: 3, resolved: 67 },
      testCoverage: 72,
      llmResponseTimeMs: 1240,
      autoCorrectionCount: 145,
    };
  }

  getEvolutionData(): EvolutionDataPoint[] {
    return [...this.evolutionData];
  }

  getTechRecommendations(): TechRecommendation[] {
    return [
      {
        technology: 'NATS JetStream',
        score: 4.8,
        effort: 'medium (3-5 days)',
        rationale: 'Persistent event bus for production-grade messaging',
      },
      {
        technology: 'LangGraph',
        score: 4.6,
        effort: 'medium (3-5 days)',
        rationale: 'Multi-agent orchestration with state graphs',
      },
      {
        technology: 'PostgreSQL+pgvector',
        score: 4.3,
        effort: 'high (1-2 weeks)',
        rationale: 'Structured storage with vector search capability',
      },
    ];
  }

  getAutoAdrs(): AutoAdrSummary[] {
    return [
      { id: '0012', title: 'Adopt NATS JetStream for Event Bus', status: 'proposed', date: '2026-07-18' },
      { id: '0013', title: 'Migrate to LangGraph Workflow Engine', status: 'proposed', date: '2026-07-18' },
      { id: '0010', title: 'Enable Strict TypeScript Mode', status: 'accepted', date: '2026-07-10' },
    ];
  }

  getRecentActivity(): ActivityEntry[] {
    return [...this.activities].sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
    ).slice(0, 20);
  }

  recordActivity(entry: ActivityEntry): void {
    this.activities.push(entry);
    if (this.activities.length > 500) this.activities.shift();
  }

  private computeTrend(): 'improving' | 'worsening' | 'stable' {
    if (this.evolutionData.length < 2) return 'stable';
    const recent = this.evolutionData.slice(-5);
    const first = recent[0]?.health ?? 50;
    const last = recent[recent.length - 1]?.health ?? 50;
    const diff = last - first;
    if (diff > 2) return 'improving';
    if (diff < -2) return 'worsening';
    return 'stable';
  }

  calculateHealthScore(): number {
    const health = this.getHealth();
    const metrics = this.getMetrics();
    const autonomyScore = this.computeAutonomyScore();
    const weighted = health.overall * 0.4 + metrics.testCoverage * 0.2 + autonomyScore * 0.2 + (100 - metrics.gapCount.open * 2) * 0.2;
    return Math.min(100, Math.max(0, Math.round(weighted)));
  }

  getPanelMetrics(): MetricCard[] {
    const metrics = this.getMetrics();
    return [
      { label: 'Test Coverage', value: metrics.testCoverage, change: 2.5, trend: 'up', unit: '%' },
      { label: 'Open Gaps', value: metrics.gapCount.open, change: -1, trend: 'down' },
      { label: 'LLM Response Time', value: metrics.llmResponseTimeMs, change: -50, trend: 'down', unit: 'ms' },
      { label: 'Auto-Corrections', value: metrics.autoCorrectionCount, change: 12, trend: 'up' },
    ];
  }

  getCharts(): ChartConfig[] {
    const evolution = this.getEvolutionData();
    return [
      {
        type: 'line',
        title: 'Health Over Time',
        series: [{
          name: 'Health',
          data: evolution.map(d => ({ timestamp: d.timestamp, value: d.health })),
          color: '#4CAF50',
        }],
      },
      {
        type: 'line',
        title: 'Coverage Over Time',
        series: [{
          name: 'Coverage',
          data: evolution.map(d => ({ timestamp: d.timestamp, value: d.coverage })),
          color: '#2196F3',
        }],
      },
    ];
  }

  getChartWidgets(): ChartConfig[] {
    const evolution = this.getEvolutionData();
    return [
      { type: 'line', title: 'Health Evolution', series: [{ name: 'Health', data: evolution.map(d => ({ timestamp: d.timestamp, value: d.health })), color: '#4CAF50' }] },
      { type: 'line', title: 'Coverage Evolution', series: [{ name: 'Coverage', data: evolution.map(d => ({ timestamp: d.timestamp, value: d.coverage })), color: '#2196F3' }] },
      { type: 'bar', title: 'Quality Scores', series: [{ name: 'Quality', data: [{ timestamp: 'Lint', value: 88 }, { timestamp: 'Types', value: 92 }, { timestamp: 'Complexity', value: 71 }, { timestamp: 'Duplication', value: 79 }, { timestamp: 'Maintainability', value: 76 }], color: '#9C27B0' }] },
      { type: 'pie', title: 'Health Distribution', series: [{ name: 'Categories', data: [{ timestamp: 'System', value: 85 }, { timestamp: 'Autonomy', value: 75 }, { timestamp: 'Safety', value: 90 }], color: '#FF9800' }] },
    ];
  }

  getMultiSeriesChart(): ChartConfig {
    const evolution = this.getEvolutionData();
    return {
      type: 'line',
      title: 'Multi-Series Comparison',
      series: [
        { name: 'Health', data: evolution.map(d => ({ timestamp: d.timestamp, value: d.health })), color: '#4CAF50' },
        { name: 'Coverage', data: evolution.map(d => ({ timestamp: d.timestamp, value: d.coverage })), color: '#2196F3' },
      ],
    };
  }

  getPieChartData(): ChartConfig {
    return {
      type: 'pie',
      title: 'Category Distribution',
      series: [{
        name: 'Categories',
        data: [
          { timestamp: 'Code Quality', value: 78 },
          { timestamp: 'Test Coverage', value: 72 },
          { timestamp: 'Dependencies', value: 65 },
          { timestamp: 'Documentation', value: 80 },
        ],
        color: '#FF9800',
      }],
    };
  }

  getBarChartData(): ChartConfig {
    return {
      type: 'bar',
      title: 'Comparative Metrics',
      series: [{
        name: 'Scores',
        data: [
          { timestamp: 'Lint', value: 88 },
          { timestamp: 'TypeScript', value: 92 },
          { timestamp: 'Complexity', value: 71 },
          { timestamp: 'Duplication', value: 79 },
        ],
        color: '#9C27B0',
      }],
    };
  }

  getAutonomyLevelCard(): AutonomyLevelCard {
    return {
      current: 'N3',
      level: 3,
      maxLevel: 5,
      progress: 60,
      nextLevel: 'N4 — Proactive',
    };
  }

  private computeAutonomyScore(): number {
    return 75;
  }
}

export function createDashboardService(
  eventBus?: EventBus,
  controlTower?: ControlTower,
): DashboardService {
  return new DashboardService(eventBus, controlTower);
}
