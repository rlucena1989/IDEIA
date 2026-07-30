export type NucleusComponent = 'agent' | 'memory' | 'llm' | 'tool' | 'planner' | 'knowledge';

export interface NucleusConfig {
  components: NucleusComponent[];
  maxConcurrency: number;
  timeoutMs: number;
  enableCircuitBreaker: boolean;
  healthCheckIntervalMs: number;
  logLevel: 'debug' | 'info' | 'warn' | 'error';
}

export interface ComponentHealth {
  component: NucleusComponent;
  status: 'healthy' | 'degraded' | 'down';
  lastCheck: number;
  latencyMs: number;
  errorCount: number;
}

export interface NucleusStatus {
  healthy: boolean;
  components: ComponentHealth[];
  uptime: number;
  tasksProcessed: number;
  avgLatencyMs: number;
  errorRate: number;
}

interface CircuitBreakerState {
  failures: number;
  open: boolean;
  lastFailure: number;
}

export class NucleusOrchestrator {
  private _config: NucleusConfig;
  private _components: Map<NucleusComponent, unknown> = new Map();
  private _circuitBreakers: Map<NucleusComponent, CircuitBreakerState> = new Map();
  private _startTime: number = Date.now();
  private _tasksProcessed: number = 0;
  private _totalLatency: number = 0;
  private _errors: number = 0;

  constructor(config?: Partial<NucleusConfig>) {
    this._config = { ...this._getDefaultConfig(), ...config };
  }

  registerComponent(type: NucleusComponent, instance: unknown): void {
    this._components.set(type, instance);
    this._circuitBreakers.set(type, { failures: 0, open: false, lastFailure: 0 });
  }

  async execute(task: string, context: Record<string, unknown>): Promise<unknown> {
    const start = performance.now();
    this._tasksProcessed++;

    if (this._config.enableCircuitBreaker) {
      for (const type of this._components.keys()) {
        if (!this._checkCircuitBreaker(type)) {
          this._errors++;
          this._totalLatency += performance.now() - start;
          throw new Error(`Circuit breaker open for component: ${type}`);
        }
      }
    }

    const component = this._components.get('agent');
    if (!component) {
      this._errors++;
      this._totalLatency += performance.now() - start;
      throw new Error('No agent component registered');
    }

    const executor = component as { execute?: (task: string, context: Record<string, unknown>) => Promise<unknown> };
    if (typeof executor.execute !== 'function') {
      this._errors++;
      this._totalLatency += performance.now() - start;
      throw new Error('Agent component does not implement execute');
    }

    try {
      const result = await executor.execute(task, context);
      this._totalLatency += performance.now() - start;
      for (const type of this._components.keys()) {
        this._recordSuccess(type);
      }
      return result;
    } catch (err) {
      this._errors++;
      this._totalLatency += performance.now() - start;
      for (const type of this._components.keys()) {
        this._recordFailure(type);
      }
      throw err;
    }
  }

  getStatus(): NucleusStatus {
    const health = this.healthCheck();
    const uptime = Date.now() - this._startTime;
    const avgLatencyMs = this._tasksProcessed > 0 ? this._totalLatency / this._tasksProcessed : 0;
    const errorRate = this._tasksProcessed > 0 ? this._errors / this._tasksProcessed : 0;
    const healthy = health.every(h => h.status === 'healthy');

    return {
      healthy,
      components: health,
      uptime,
      tasksProcessed: this._tasksProcessed,
      avgLatencyMs,
      errorRate,
    };
  }

  healthCheck(): ComponentHealth[] {
    const health: ComponentHealth[] = [];
    for (const [component, instance] of this._components.entries()) {
      const cb = this._circuitBreakers.get(component);
      const now = Date.now();
      let status: ComponentHealth['status'] = 'healthy';
      const latencyMs = 0;
      const errorCount = cb ? cb.failures : 0;

      if (cb && cb.open) {
        const cooldownPassed = now - cb.lastFailure > 30000;
        if (cooldownPassed) {
          cb.open = false;
          cb.failures = 0;
          status = 'healthy';
        } else {
          status = 'down';
        }
      } else if (cb && cb.failures >= 5) {
        status = 'degraded';
      }

      if (!instance) {
        status = 'down';
      }

      health.push({ component, status, lastCheck: now, latencyMs, errorCount });
    }
    return health;
  }

  reset(): void {
    this._components.clear();
    this._circuitBreakers.clear();
    this._startTime = Date.now();
    this._tasksProcessed = 0;
    this._totalLatency = 0;
    this._errors = 0;
  }

  private _getDefaultConfig(): NucleusConfig {
    return {
      components: ['agent', 'memory', 'llm', 'tool', 'planner', 'knowledge'],
      maxConcurrency: 4,
      timeoutMs: 30000,
      enableCircuitBreaker: true,
      healthCheckIntervalMs: 30000,
      logLevel: 'info',
    };
  }

  private _checkCircuitBreaker(component: NucleusComponent): boolean {
    const cb = this._circuitBreakers.get(component);
    if (!cb) return true;
    if (!cb.open) return true;
    const now = Date.now();
    if (now - cb.lastFailure > 30000) {
      cb.open = false;
      cb.failures = 0;
      return true;
    }
    return false;
  }

  private _recordFailure(component: NucleusComponent): void {
    const cb = this._circuitBreakers.get(component);
    if (!cb) return;
    cb.failures++;
    cb.lastFailure = Date.now();
    if (cb.failures >= 5) {
      cb.open = true;
    }
  }

  private _recordSuccess(component: NucleusComponent): void {
    const cb = this._circuitBreakers.get(component);
    if (!cb) return;
    cb.failures = 0;
  }

  private _getComponent(type: NucleusComponent): unknown {
    return this._components.get(type);
  }
}
