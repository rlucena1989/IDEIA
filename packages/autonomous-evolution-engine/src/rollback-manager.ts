import { createLogger } from '@ideia/logger';

const log = createLogger('evolution:rollback');

export type CircuitState = 'closed' | 'open' | 'half-open';

export interface RollbackPoint {
  id: string;
  timestamp: number;
  description: string;
  snapshot: Record<string, unknown>;
  metrics: {
    throughput?: number;
    errorRate?: number;
    latency?: number;
    health?: number;
  };
}

export interface RollbackResult {
  success: boolean;
  point?: RollbackPoint;
  restoredMetrics: Record<string, number>;
  errors: string[];
}

export class RollbackManager {
  private points: RollbackPoint[] = [];
  private maxPoints = 20;
  private circuitState: CircuitState = 'closed';
  private circuitFailures = 0;
  private circuitThreshold = 3;
  private circuitHalfOpenTimeout = 30000;

  savePoint(description: string, snapshot: Record<string, unknown>, metrics?: Partial<RollbackPoint['metrics']>): RollbackPoint {
    const point: RollbackPoint = {
      id: `rb-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      timestamp: Date.now(),
      description,
      snapshot: { ...snapshot },
      metrics: {
        throughput: metrics?.throughput,
        errorRate: metrics?.errorRate,
        latency: metrics?.latency,
        health: metrics?.health ?? 100,
      },
    };
    this.points.push(point);
    if (this.points.length > this.maxPoints) this.points.shift();
    log.info(`Rollback point saved: ${point.id} - ${description}`);
    return point;
  }

  async rollback(pointId: string): Promise<RollbackResult> {
    const point = this.points.find(p => p.id === pointId);
    if (!point) {
      return { success: false, point: undefined, restoredMetrics: {}, errors: [`Rollback point ${pointId} not found`] };
    }
    try {
      log.info(`Rolling back to point: ${point.id} - ${point.description}`);
      return {
        success: true,
        point,
        restoredMetrics: {
          throughput: point.metrics.throughput ?? 0,
          errorRate: point.metrics.errorRate ?? 0,
          latency: point.metrics.latency ?? 0,
        },
        errors: [],
      };
    } catch (_err) {
      return { success: false, point, restoredMetrics: {}, errors: [_err instanceof Error ? _err.message : String(_err)] };
    }
  }

  async rollbackToLatest(): Promise<RollbackResult | null> {
    if (this.points.length === 0) return null;
    return this.rollback(this.points[this.points.length - 1].id);
  }

  async autoRollback(threshold = 60): Promise<RollbackResult | null> {
    const health = this.checkHealth();
    if (health >= threshold) {
      log.info(`Auto-rollback skipped: health ${health} >= threshold ${threshold}`);
      return null;
    }
    log.warn(`Auto-rollback triggered: health ${health} < threshold ${threshold}`);
    const latest = await this.rollbackToLatest();
    if (!latest || !latest.success) {
      this.circuitFailures++;
      this.updateCircuitState();
    }
    return latest;
  }

  checkHealth(): number {
    if (this.points.length === 0) return 100;
    const recent = this.points.slice(-5);
    const avgHealth = recent.reduce((s, p) => s + (p.metrics.health ?? 100), 0) / recent.length;
    return Math.min(100, Math.max(0, Math.round(avgHealth)));
  }

  async rollbackWithHealthCheck(pointId: string): Promise<RollbackResult> {
    const beforeHealth = this.checkHealth();
    const result = await this.rollback(pointId);
    if (result.success) {
      const afterHealth = this.checkHealth();
      log.info(`Health before rollback: ${beforeHealth}, after: ${afterHealth}`);
      if (afterHealth < beforeHealth) {
        log.warn(`Health degraded after rollback: ${beforeHealth} -> ${afterHealth}`);
      }
    }
    return result;
  }

  getCircuitState(): CircuitState {
    if (this.circuitState === 'open') {
      const lastPoint = this.points[this.points.length - 1];
      if (lastPoint && Date.now() - lastPoint.timestamp > this.circuitHalfOpenTimeout) {
        this.circuitState = 'half-open';
      }
    }
    return this.circuitState;
  }

  private updateCircuitState(): void {
    if (this.circuitFailures >= this.circuitThreshold) {
      this.circuitState = 'open';
      log.error(`Circuit breaker OPEN after ${this.circuitFailures} failures`);
    }
  }

  listPoints(): RollbackPoint[] {
    return [...this.points];
  }

  getPoint(id: string): RollbackPoint | undefined {
    return this.points.find(p => p.id === id);
  }

  clear(): void {
    this.points = [];
    this.circuitState = 'closed';
    this.circuitFailures = 0;
    log.info('Rollback points cleared');
  }
}

export function createRollbackManager(): RollbackManager {
  return new RollbackManager();
}
