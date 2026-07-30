import { createLogger } from '@ideia/logger';
import {
  HealthCheckRegistry,
} from './types';

const logger = createLogger('resilience-v2:health-dashboard');

export interface HealthDashboardConfig {
  aggregatorIntervalMs: number;
  cacheTtlMs: number;
  degradationThreshold: number;
  unhealthyThreshold: number;
}

export interface ServiceHealthEntry {
  name: string;
  status: 'healthy' | 'degraded' | 'unhealthy';
  latencyMs: number;
  lastChecked: Date;
  error?: string;
  metadata?: Record<string, unknown>;
}

export interface DependencyGraph {
  edges: Array<{ from: string; to: string }>;
}

export interface AggregateDashboardHealth {
  overall: 'healthy' | 'degraded' | 'unhealthy';
  services: ServiceHealthEntry[];
  degradedCount: number;
  unhealthyCount: number;
  healthyCount: number;
  totalCount: number;
  uptime: number;
  lastUpdated: Date;
  dependencyGraph: DependencyGraph;
  trends: Record<string, { status: string; change: string }>;
}

const DEFAULT_CONFIG: HealthDashboardConfig = {
  aggregatorIntervalMs: 15000,
  cacheTtlMs: 5000,
  degradationThreshold: 0.3,
  unhealthyThreshold: 0.1,
};

export class HealthDashboardAggregator {
  private registry: HealthCheckRegistry;
  private config: HealthDashboardConfig;
  private cache = new Map<string, ServiceHealthEntry>();
  private history = new Map<string, ServiceHealthEntry[]>();
  private maxHistoryPerService = 20;
  private startTime = Date.now();
  private timer: ReturnType<typeof setInterval> | null = null;

  constructor(registry: HealthCheckRegistry, config?: Partial<HealthDashboardConfig>) {
    this.registry = registry;
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  getDependencyGraph(): DependencyGraph {
    const edges: Array<{ from: string; to: string }> = [];
    const checks = Array.from(this.cache.values());
    for (const check of checks) {
      const metadata = check.metadata || {};
      const deps = metadata.dependencies as string[] | undefined;
      if (deps) {
        for (const dep of deps) {
          edges.push({ from: check.name, to: dep });
        }
      }
    }
    return { edges };
  }

  getAggregateHealth(): AggregateDashboardHealth {
    const services = Array.from(this.cache.values());
    const healthyCount = services.filter(s => s.status === 'healthy').length;
    const degradedCount = services.filter(s => s.status === 'degraded').length;
    const unhealthyCount = services.filter(s => s.status === 'unhealthy').length;
    const totalCount = services.length;

    let overall: AggregateDashboardHealth['overall'] = 'healthy';
    const unhealthyRatio = totalCount > 0 ? unhealthyCount / totalCount : 0;
    const degradedRatio = totalCount > 0 ? degradedCount / totalCount : 0;

    if (unhealthyRatio >= this.config.unhealthyThreshold) {
      overall = 'unhealthy';
    } else if (degradedRatio >= this.config.degradationThreshold) {
      overall = 'degraded';
    }

    const trends: Record<string, { status: string; change: string }> = {};
    for (const [name, entries] of this.history) {
      if (entries.length < 2) {
        trends[name] = { status: entries[0]?.status || 'unknown', change: 'insufficient_data' };
        continue;
      }
      const current = entries[entries.length - 1];
      const previous = entries[entries.length - 2];
      trends[name] = {
        status: current.status,
        change: current.status === previous.status ? 'stable' : `${previous.status} -> ${current.status}`,
      };
    }

    return {
      overall,
      services,
      degradedCount,
      unhealthyCount,
      healthyCount,
      totalCount,
      uptime: Math.floor((Date.now() - this.startTime) / 1000),
      lastUpdated: new Date(),
      dependencyGraph: this.getDependencyGraph(),
      trends,
    };
  }

  startAutoRefresh(): void {
    if (this.timer) return;
    this.timer = setInterval(() => this.refresh(), this.config.aggregatorIntervalMs);
    this.refresh();
    logger.info('Health dashboard auto-refresh started', { intervalMs: this.config.aggregatorIntervalMs });
  }

  stopAutoRefresh(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  private async refresh(): Promise<void> {
    try {
      const results = await this.registry.runAll();
      for (const result of results) {
        const entry: ServiceHealthEntry = {
          name: result.name,
          status: result.healthy ? 'healthy' : 'unhealthy',
          latencyMs: result.latencyMs,
          lastChecked: new Date(),
          error: result.error,
          metadata: result.metadata,
        };
        this.cache.set(result.name, entry);

        if (!this.history.has(result.name)) {
          this.history.set(result.name, []);
        }
        const history = this.history.get(result.name) as ServiceHealthEntry[];
        history.push(entry);
        if (history.length > this.maxHistoryPerService) history.shift();
      }

      const summary = this.getAggregateHealth();
      if (summary.overall !== 'healthy') {
        logger.warn('Health degradation detected', {
          overall: summary.overall,
          unhealthy: summary.unhealthyCount,
          degraded: summary.degradedCount,
        });
      }
    } catch (e) {
      logger.error('Health dashboard refresh failed', { error: String(e) });
    }
  }
}

export function createHealthDashboardAggregator(registry: HealthCheckRegistry, config?: Partial<HealthDashboardConfig>): HealthDashboardAggregator {
  return new HealthDashboardAggregator(registry, config);
}
