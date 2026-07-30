import { CircuitBreaker, CircuitBreakerConfig, createCircuitBreaker } from './circuit-breaker';
import { createLogger } from '@ideia/logger';
import { Bulkhead, DegradationManager } from './resilience-engine';
const logger = createLogger('metrics-export');

export interface BreakerMetricsSnapshot {
  name: string;
  state: string;
  failures: number;
  successes: number;
  totalCalls: number;
  openCount: number;
  halfOpenCount: number;
  lastFailure: number | null;
  lastSuccess: number | null;
  failureRate: number;
  uptimePercent: number;
}

export interface MetricsExportFormat {
  timestamp: string;
  breakers: BreakerMetricsSnapshot[];
  bulkheads: Array<{ name: string; utilization: number; activeCount: number; maxConcurrent: number }>;
  degradationMode: string;
  systemUptimeMs: number;
}

export class CircuitBreakerMetricsExporter {
  private breakers: Map<string, CircuitBreaker> = new Map();
  private bulkheads: Map<string, Bulkhead> = new Map();
  private degradationManager: DegradationManager;
  private startTime: number;
  private history: BreakerMetricsSnapshot[][] = [];
  private maxHistoryLength: number;

  constructor(
    degradationManager: DegradationManager,
    breakers?: Array<{ breaker: CircuitBreaker; name: string }>,
    bulkheads?: Array<{ bulkhead: Bulkhead; name: string }>,
    maxHistoryLength = 100,
  ) {
    this.degradationManager = degradationManager;
    this.startTime = Date.now();
    this.maxHistoryLength = maxHistoryLength;

    if (breakers) {
      for (const { breaker, name } of breakers) {
        this.breakers.set(name, breaker);
      }
    }
    if (bulkheads) {
      for (const { bulkhead, name } of bulkheads) {
        this.bulkheads.set(name, bulkhead);
      }
    }
  }

  registerBreaker(name: string, breaker: CircuitBreaker): void {
    this.breakers.set(name, breaker);
  }

  registerBulkhead(name: string, bulkhead: Bulkhead): void {
    this.bulkheads.set(name, bulkhead);
  }

  registerNamedBreaker(name: string, config?: Partial<CircuitBreakerConfig>): CircuitBreaker {
    const breaker = createCircuitBreaker({ name, ...config }, this.degradationManager);
    this.breakers.set(name, breaker);
    return breaker;
  }

  snapshot(): BreakerMetricsSnapshot[] {
    const snapshots: BreakerMetricsSnapshot[] = [];

    for (const [name, breaker] of this.breakers) {
      const stats = breaker.getStats();
      const totalAttempts = stats.failures + stats.successes;
      const failureRate = totalAttempts > 0 ? stats.failures / totalAttempts : 0;
      const uptimePercent = stats.openCount > 0
        ? Math.max(0, 100 - (stats.openCount * 5))
        : 100;

      snapshots.push({
        name,
        state: stats.state,
        failures: stats.failures,
        successes: stats.successes,
        totalCalls: totalAttempts,
        openCount: stats.openCount,
        halfOpenCount: stats.halfOpenCount,
        lastFailure: stats.lastFailure,
        lastSuccess: stats.lastSuccess,
        failureRate: Math.round(failureRate * 10000) / 100,
        uptimePercent: Math.round(uptimePercent * 100) / 100,
      });
    }

    this.history.push(snapshots);
    if (this.history.length > this.maxHistoryLength) {
      this.history = this.history.slice(-this.maxHistoryLength);
    }

    return snapshots;
  }

  exportMetrics(): MetricsExportFormat {
    return {
      timestamp: new Date().toISOString(),
      breakers: this.snapshot(),
      bulkheads: Array.from(this.bulkheads.entries()).map(([name, bh]) => ({
        name,
        utilization: bh.utilization,
        activeCount: bh.activeCount,
        maxConcurrent: Math.round(bh.activeCount / (bh.utilization || 0.01)),
      })),
      degradationMode: this.degradationManager.mode,
      systemUptimeMs: Date.now() - this.startTime,
    };
  }

  getFailureRate(name: string): number {
    const breaker = this.breakers.get(name);
    if (!breaker) return 0;
    const stats = breaker.getStats();
    const total = stats.failures + stats.successes;
    return total > 0 ? stats.failures / total : 0;
  }

  getHistory(): BreakerMetricsSnapshot[][] {
    return [...this.history];
  }

  getTrend(name: string): { improving: boolean; failureRateDelta: number } {
    if (this.history.length < 2) return { improving: true, failureRateDelta: 0 };
    const recent = this.history.slice(-5);
    const rates = recent.map(snap => {
      const entry = snap.find(s => s.name === name);
      return entry?.failureRate ?? 0;
    }).filter(r => r > 0);

    if (rates.length < 2) return { improving: true, failureRateDelta: 0 };

    const first = rates[0];
    const last = rates[rates.length - 1];
    return { improving: last <= first, failureRateDelta: Math.round((last - first) * 100) / 100 };
  }

  generatePrometheusFormat(): string {
    const metrics = this.exportMetrics();
    const lines: string[] = [];

    lines.push('# HELP circuit_breaker_state Current state of circuit breakers');
    lines.push('# TYPE circuit_breaker_state gauge');
    for (const b of metrics.breakers) {
      lines.push(`circuit_breaker_state{name="${b.name}",state="${b.state}"} ${b.state === 'open' ? 1 : b.state === 'half-open' ? 0.5 : 0}`);
      lines.push(`circuit_breaker_failure_rate{name="${b.name}"} ${b.failureRate}`);
      lines.push(`circuit_breaker_open_count{name="${b.name}"} ${b.openCount}`);
      lines.push(`circuit_breaker_uptime_percent{name="${b.name}"} ${b.uptimePercent}`);
    }

    lines.push('# HELP bulkhead_utilization Current utilization of bulkheads');
    lines.push('# TYPE bulkhead_utilization gauge');
    for (const bh of metrics.bulkheads) {
      lines.push(`bulkhead_utilization{name="${bh.name}"} ${bh.utilization}`);
    }

    lines.push(`degradation_mode{mode="${metrics.degradationMode}"} 1`);
    lines.push(`system_uptime_ms ${metrics.systemUptimeMs}`);

    return lines.join('\n');
  }
}
