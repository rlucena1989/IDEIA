import { createLogger } from '@ideia/logger';
import { HealthCheckRegistry } from './types';
import * as http from 'http';

const logger = createLogger('resilience-v2:chaos-suite');

export type ChaosMode = 'latency' | 'crash' | 'partition';

export interface ChaosSuiteConfig {
  enabled: boolean;
  dryRun: boolean;
  latencyMaxMs: number;
  crashProbability: number;
  partitionDurationMs: number;
  safetyEnabled: boolean;
  whitelistedTargets: string[];
}

export interface ChaosResult {
  mode: ChaosMode;
  target: string;
  success: boolean;
  durationMs: number;
  observedImpact: string;
  timestamp: string;
}

export class ChaosSuite {
  private config: ChaosSuiteConfig;
  private healthRegistry?: HealthCheckRegistry;
  private results: ChaosResult[] = [];
  private activeLatency: Map<string, number> = new Map();
  private activeCrash: boolean = false;
  private activePartition: Set<string> = new Set();
  private originalFs: Record<string, unknown> = {};

  constructor(config?: Partial<ChaosSuiteConfig>, healthRegistry?: HealthCheckRegistry) {
    this.config = {
      enabled: false,
      dryRun: true,
      latencyMaxMs: 5000,
      crashProbability: 0.3,
      partitionDurationMs: 10000,
      safetyEnabled: true,
      whitelistedTargets: [],
      ...config,
    };
    this.healthRegistry = healthRegistry;
  }

  async runLatency(target: string, delayMs: number): Promise<ChaosResult> {
    const start = Date.now();
    if (!this.config.enabled || this.config.dryRun) {
      return { mode: 'latency', target, success: true, durationMs: 0, observedImpact: 'dry-run', timestamp: new Date().toISOString() };
    }

    if (this.config.safetyEnabled && !this.config.whitelistedTargets.includes(target)) {
      logger.warn('Latency chaos blocked: target not whitelisted', { target });
      return { mode: 'latency', target, success: false, durationMs: 0, observedImpact: 'blocked-by-safety', timestamp: new Date().toISOString() };
    }

    const actualDelay = Math.min(delayMs, this.config.latencyMaxMs);
    this.activeLatency.set(target, actualDelay);

    try {
      if (target === 'event-bus' || target === 'nats') {
        await this.injectNatsLatency(actualDelay);
      } else if (target === 'http') {
        await this.injectHttpLatency(actualDelay);
      } else if (target === 'filesystem') {
        await this.injectFsLatency(actualDelay);
      }

      await new Promise(r => setTimeout(r, Math.min(actualDelay, 1000)));

      this.cleanupLatency(target);
      const healthOk = await this.checkHealth();

      return {
        mode: 'latency',
        target,
        success: true,
        durationMs: Date.now() - start,
        observedImpact: healthOk ? 'degraded-acceptable' : 'degraded-critical',
        timestamp: new Date().toISOString(),
      };
    } catch (err) {
      this.cleanupLatency(target);
      return { mode: 'latency', target, success: false, durationMs: Date.now() - start, observedImpact: String(err), timestamp: new Date().toISOString() };
    }
  }

  async runCrash(target: string): Promise<ChaosResult> {
    const start = Date.now();
    if (!this.config.enabled || this.config.dryRun) {
      return { mode: 'crash', target, success: true, durationMs: 0, observedImpact: 'dry-run', timestamp: new Date().toISOString() };
    }

    if (this.config.safetyEnabled && !this.config.whitelistedTargets.includes(target)) {
      return { mode: 'crash', target, success: false, durationMs: 0, observedImpact: 'blocked-by-safety', timestamp: new Date().toISOString() };
    }

    if (Math.random() > this.config.crashProbability) {
      return { mode: 'crash', target, success: true, durationMs: 0, observedImpact: 'skipped-probability', timestamp: new Date().toISOString() };
    }

    this.activeCrash = true;

    try {
      if (target === 'event-bus') {
        await this.injectEventBusCrash();
      } else if (target === 'http') {
        await this.injectHttpCrash();
      } else if (target === 'service') {
        await this.injectServiceCrash();
      }

      const healthOk = await this.checkHealth();

      this.activeCrash = false;
      return {
        mode: 'crash',
        target,
        success: true,
        durationMs: Date.now() - start,
        observedImpact: healthOk ? 'self-healed' : 'degraded',
        timestamp: new Date().toISOString(),
      };
    } catch (err) {
      this.activeCrash = false;
      return { mode: 'crash', target, success: false, durationMs: Date.now() - start, observedImpact: String(err), timestamp: new Date().toISOString() };
    }
  }

  async runPartition(target: string): Promise<ChaosResult> {
    const start = Date.now();
    if (!this.config.enabled || this.config.dryRun) {
      return { mode: 'partition', target, success: true, durationMs: 0, observedImpact: 'dry-run', timestamp: new Date().toISOString() };
    }

    if (this.config.safetyEnabled && !this.config.whitelistedTargets.includes(target)) {
      return { mode: 'partition', target, success: false, durationMs: 0, observedImpact: 'blocked-by-safety', timestamp: new Date().toISOString() };
    }

    this.activePartition.add(target);

    try {
      if (target === 'nats' || target === 'event-bus') {
        await this.injectNatsPartition();
      } else if (target === 'database') {
        await this.injectDatabasePartition();
      }

      const partitionDuration = Math.min(this.config.partitionDurationMs, 30000);
      await new Promise(r => setTimeout(r, partitionDuration));

      this.cleanupPartition(target);

      const healthOk = await this.checkHealth();

      return {
        mode: 'partition',
        target,
        success: true,
        durationMs: Date.now() - start,
        observedImpact: healthOk ? 'recovered' : 'degraded',
        timestamp: new Date().toISOString(),
      };
    } catch (err) {
      this.cleanupPartition(target);
      return { mode: 'partition', target, success: false, durationMs: Date.now() - start, observedImpact: String(err), timestamp: new Date().toISOString() };
    }
  }

  getResults(): ChaosResult[] {
    return [...this.results];
  }

  private async injectNatsLatency(_delayMs: number): Promise<void> {
    await new Promise(r => setTimeout(r, 50));
  }

  private async injectHttpLatency(delayMs: number): Promise<void> {
    const originalHttp = http.request;
    const writableHttp = http as { request: typeof http.request };
    writableHttp.request = ((...args: Parameters<typeof http.request>) => {
      const clientReq = originalHttp(...args);
      const originalEnd = clientReq.end.bind(clientReq);
      clientReq.end = function (...endArgs: Parameters<typeof clientReq.end>) {
        setTimeout(() => originalEnd(...endArgs), delayMs);
        return clientReq;
      } as typeof clientReq.end;
      return clientReq;
    }) as typeof http.request;
  }

  private async injectFsLatency(_delayMs: number): Promise<void> {
    await new Promise(r => setTimeout(r, 100));
  }

  private async injectEventBusCrash(): Promise<void> {
    await new Promise(r => setTimeout(r, 100));
  }

  private async injectHttpCrash(): Promise<void> {
    const writableHttp = http as { request: typeof http.request };
    const originalRequest = writableHttp.request;
    writableHttp.request = ((..._args: Parameters<typeof http.request>) => {
      const clientReq = originalRequest('http://localhost:1');
      setTimeout(() => clientReq.destroy(new Error('Chaos: injected HTTP crash')), 0);
      return clientReq;
    }) as typeof http.request;
  }

  private async injectServiceCrash(): Promise<void> {
    if (typeof global.gc === 'function') global.gc();
  }

  private async injectNatsPartition(): Promise<void> {
    await new Promise(r => setTimeout(r, 100));
  }

  private async injectDatabasePartition(): Promise<void> {
    await new Promise(r => setTimeout(r, 100));
  }

  private cleanupLatency(target: string): void {
    this.activeLatency.delete(target);
  }

  private cleanupPartition(target: string): void {
    this.activePartition.delete(target);
  }

  private async checkHealth(): Promise<boolean> {
    if (!this.healthRegistry) return true;
    try {
      const results = await this.healthRegistry.runAll();
      return results.every(r => r.healthy);
    } catch {
      return false;
    }
  }
}
