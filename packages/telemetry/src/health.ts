export interface HealthCheck {
  name: string;
  status: 'ok' | 'degraded' | 'down';
  latencyMs: number;
  lastCheck: string;
  detail?: string;
}

export interface HealthReport {
  status: 'ok' | 'degraded' | 'down';
  checks: HealthCheck[];
  uptime: number;
  timestamp: string;
  version: string;
}

type HealthChecker = () => Promise<HealthCheck>;

export class HealthAggregator {
  private checks = new Map<string, HealthChecker>();
  private startTime = Date.now();

  register(name: string, checker: HealthChecker): void {
    this.checks.set(name, checker);
  }

  unregister(name: string): void {
    this.checks.delete(name);
  }

  async check(name: string): Promise<HealthCheck | undefined> {
    const checker = this.checks.get(name);
    if (!checker) return undefined;
    return checker();
  }

  async checkAll(): Promise<HealthReport> {
    const results = await Promise.all(
      Array.from(this.checks.entries()).map(async ([name, checker]) => {
        const start = performance.now();
        try {
          const result = await checker();
          return result;
        } catch (_error) {
          return {
            name,
            status: 'down' as const,
            latencyMs: Math.round(performance.now() - start),
            lastCheck: new Date().toISOString(),
            detail: error instanceof Error ? error.message : String(error),
          };
        }
      }),
    );

    const hasDown = results.some(r => r.status === 'down');
    const hasDegraded = results.some(r => r.status === 'degraded');

    return {
      status: hasDown ? 'down' : hasDegraded ? 'degraded' : 'ok',
      checks: results,
      uptime: Math.floor((Date.now() - this.startTime) / 1000),
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version ?? '1.0.0',
    };
  }

  async handler(): Promise<HealthReport> {
    return this.checkAll();
  }

  getUptime(): number {
    return Math.floor((Date.now() - this.startTime) / 1000);
  }

  reset(): void {
    this.startTime = Date.now();
    this.checks.clear();
  }
}

let defaultAggregator: HealthAggregator | null = null;

export function getHealthAggregator(): HealthAggregator {
  if (!defaultAggregator) {
    defaultAggregator = new HealthAggregator();

    defaultAggregator.register('process', async () => ({
      name: 'process',
      status: 'ok',
      latencyMs: 0,
      lastCheck: new Date().toISOString(),
      detail: `PID ${process.pid}, uptime ${Math.floor(process.uptime())}s`,
    }));

    defaultAggregator.register('memory', async () => {
      const mem = process.memoryUsage();
      const heapPct = mem.heapUsed / mem.heapTotal;
      return {
        name: 'memory',
        status: heapPct > 0.9 ? 'degraded' : 'ok',
        latencyMs: 0,
        lastCheck: new Date().toISOString(),
        detail: `Heap: ${Math.round(mem.heapUsed / 1024 / 1024)}MB/${Math.round(mem.heapTotal / 1024 / 1024)}MB (${(heapPct * 100).toFixed(1)}%)`,
      };
    });

    defaultAggregator.register('event-bus', async () => ({
      name: 'event-bus',
      status: 'ok',
      latencyMs: 0,
      lastCheck: new Date().toISOString(),
    }));
  }
  return defaultAggregator;
}
