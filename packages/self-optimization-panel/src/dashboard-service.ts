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
}

export function createDashboardService(
  eventBus?: EventBus,
  controlTower?: ControlTower,
): DashboardService {
  return new DashboardService(eventBus, controlTower);
}
