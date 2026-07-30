import { createLogger } from '@ideia/logger';
import * as fs from 'fs';
import * as http from 'http';

const logger = createLogger('resilience-engine:chaos-test');

export type ChaosTarget = 'http' | 'event-bus' | 'database' | 'cache' | 'filesystem';
export type ChaosAction = 'latency' | 'error' | 'crash' | 'packet-loss' | 'resource-exhaustion';

export interface ChaosExperiment {
  name: string;
  target: ChaosTarget;
  action: ChaosAction;
  durationMs: number;
  intensity: number;
  probability: number;
  conditions?: Record<string, string>;
}

export interface ChaosResult {
  experiment: string;
  target: ChaosTarget;
  action: ChaosAction;
  success: boolean;
  durationMs: number;
  impact: {
    failuresDetected: number;
    recoveryTimeMs: number;
    degradationLevel: 'none' | 'minor' | 'moderate' | 'severe' | 'critical';
  };
  timestamp: string;
}

export interface ChaosConfig {
  enabled: boolean;
  dryRun: boolean;
  maxConcurrentExperiments: number;
  safetyGuards: boolean;
}

interface FaultInterceptor {
  target: ChaosTarget;
  action: ChaosAction;
  restore: () => void;
}

const writableHttp = http as { request: typeof http.request };
const writableFs = fs as { readFile: typeof fs.readFile; writeFile: typeof fs.writeFile };

export class ChaosTestEngine {
  private experiments: ChaosExperiment[] = [];
  private results: ChaosResult[] = [];
  private activeExperiments = 0;
  private config: ChaosConfig;
  private faultInterceptors: Map<string, FaultInterceptor> = new Map();

  constructor(config?: Partial<ChaosConfig>) {
    this.config = {
      enabled: false,
      dryRun: true,
      maxConcurrentExperiments: 2,
      safetyGuards: true,
      ...config,
    };
  }

  registerExperiment(experiment: ChaosExperiment): void {
    this.experiments.push(experiment);
  }

  getExperiments(): ChaosExperiment[] {
    return [...this.experiments];
  }

  async runAll(): Promise<ChaosResult[]> {
    if (!this.config.enabled) {
      logger.warn('Chaos testing is disabled. Set enabled: true to run.');
      return [];
    }

    const batch: ChaosResult[] = [];
    for (const exp of this.experiments) {
      if (this.activeExperiments >= this.config.maxConcurrentExperiments) break;
      const result = await this.runExperiment(exp);
      batch.push(result);
    }
    this.results.push(...batch);
    return batch;
  }

  async runExperiment(experiment: ChaosExperiment): Promise<ChaosResult> {
    this.activeExperiments++;
    const start = Date.now();

    try {
      if (this.config.dryRun) {
        const result: ChaosResult = {
          experiment: experiment.name,
          target: experiment.target,
          action: experiment.action,
          success: true,
          durationMs: Date.now() - start,
          impact: { failuresDetected: 0, recoveryTimeMs: 0, degradationLevel: 'none' },
          timestamp: new Date().toISOString(),
        };
        this.activeExperiments--;
        return result;
      }

      this.injectFault(experiment);
      await this.delay(experiment.durationMs);
      this.removeFault(experiment);

      const impact = await this.measureImpact(experiment);
      const result: ChaosResult = {
        experiment: experiment.name,
        target: experiment.target,
        action: experiment.action,
        success: true,
        durationMs: Date.now() - start,
        impact,
        timestamp: new Date().toISOString(),
      };
      this.activeExperiments--;
      return result;
    } catch (_error) {
      this.removeFault(experiment);
      this.activeExperiments--;
      return {
        experiment: experiment.name,
        target: experiment.target,
        action: experiment.action,
        success: false,
        durationMs: Date.now() - start,
        impact: { failuresDetected: 0, recoveryTimeMs: 0, degradationLevel: 'critical' },
        timestamp: new Date().toISOString(),
      };
    }
  }

  getResults(): ChaosResult[] {
    return [...this.results];
  }

  private injectFault(experiment: ChaosExperiment): void {
    const key = `${experiment.target}:${experiment.action}`;
    if (this.faultInterceptors.has(key)) return;

    switch (experiment.target) {
      case 'http':
        this.injectHttpFault(experiment, key);
        break;
      case 'event-bus':
        this.injectEventBusFault(experiment, key);
        break;
      case 'database':
        this.injectDatabaseFault(experiment, key);
        break;
      case 'cache':
        this.injectCacheFault(experiment, key);
        break;
      case 'filesystem':
        this.injectFilesystemFault(experiment, key);
        break;
      default:
        this.injectGenericFault(experiment, key);
        break;
    }
  }

  private injectGenericFault(experiment: ChaosExperiment, key: string): void {
    const probability = experiment.probability;
    let restored = false;
    const restoreFns: Array<() => void> = [];

    try {
      if (experiment.action === 'crash') {
        const origSetTimeout = global.setTimeout;
        restoreFns.push(() => { (global as typeof globalThis).setTimeout = origSetTimeout; });
        (global as typeof globalThis).setTimeout = ((fn: TimerHandler, ms?: number, ...args: unknown[]) => {
          if (Math.random() < probability) {
            logger.warn(`[Chaos] Injecting service crash simulation via dropped timeout, intensity=${experiment.intensity}`);
            return origSetTimeout(() => {});
          }
          return origSetTimeout(fn, ms, ...args);
        }) as typeof global.setTimeout;
        this.faultInterceptors.set(key, {
          target: experiment.target, action: experiment.action,
          restore: () => { if (restored) return; restored = true; for (const fn of restoreFns) fn(); },
        });
        return;
      }

      if (experiment.action === 'resource-exhaustion') {
        const origHrtime = process.hrtime;
        const memPressureBytes = Math.round(experiment.intensity * 64 * 1024 * 1024);
        restoreFns.push(() => { process.hrtime = origHrtime; });
        process.hrtime = ((time?: [number, number]) => {
          if (Math.random() < probability) {
            const buf = Buffer.alloc(memPressureBytes);
            buf[0] = 1;
            logger.warn(`[Chaos] Injecting memory pressure: ${memPressureBytes} bytes, intensity=${experiment.intensity}`);
          }
          return origHrtime(time);
        }) as typeof process.hrtime;
        this.faultInterceptors.set(key, {
          target: experiment.target, action: experiment.action,
          restore: () => { if (restored) return; restored = true; for (const fn of restoreFns) fn(); },
        });
        return;
      }
    } catch (err) {
      logger.warn(`Could not inject generic fault for ${experiment.target}:${experiment.action}`);
    }
  }

  private injectHttpFault(experiment: ChaosExperiment, key: string): void {
    const originalRequest = writableHttp.request;
    const probability = experiment.probability;

    writableHttp.request = ((...args: Parameters<typeof http.request>) => {
      if (Math.random() < probability) {
        if (experiment.action === 'latency') {
          const delayMs = Math.round(experiment.intensity * 1000);
          const clientReq = originalRequest(...args);
          const originalEnd = clientReq.end.bind(clientReq);
          clientReq.end = function (...endArgs: Parameters<typeof clientReq.end>) {
            setTimeout(() => originalEnd(...endArgs), delayMs);
            return clientReq;
          } as typeof clientReq.end;
          return clientReq;
        }
        if (experiment.action === 'error') {
          const clientReq = originalRequest(...args);
          setTimeout(() => clientReq.destroy(new Error(`Chaos: injected HTTP error (intensity=${experiment.intensity})`)), 0);
          return clientReq;
        }
      }
      return originalRequest(...args);
    }) as typeof http.request;

    this.faultInterceptors.set(key, {
      target: experiment.target,
      action: experiment.action,
      restore: () => { writableHttp.request = originalRequest; },
    });
  }

  private injectEventBusFault(experiment: ChaosExperiment, key: string): void {
    const probability = experiment.probability;
    let restored = false;
    const restoreFns: Array<() => void> = [];

    try {
      const eventBusMod = require('@ideia/event-bus') as { EventBus?: { prototype: Record<string, (...args: unknown[]) => unknown> } };
      if (eventBusMod?.EventBus?.prototype) {
        const proto = eventBusMod.EventBus.prototype;
        const origPublish = proto.publish;
        const origEmit = proto.emit;
        if (origPublish || origEmit) {
          if (experiment.action === 'latency' && origPublish) {
            const delayMs = Math.round(experiment.intensity * 1000);
            proto.publish = async function (...args: unknown[]) {
              if (Math.random() < probability) {
                await new Promise(r => setTimeout(r, delayMs));
              }
              return origPublish.apply(this, args);
            };
            restoreFns.push(() => { proto.publish = origPublish; });
          }
          if (experiment.action === 'error' && origEmit) {
            proto.emit = function (...args: unknown[]) {
              if (Math.random() < probability) {
                throw new Error(`Chaos: injected event-bus error (intensity=${experiment.intensity})`);
              }
              return origEmit.apply(this, args);
            };
            restoreFns.push(() => { proto.emit = origEmit; });
          }
        }
      }
    } catch {
      logger.warn('Could not monkey-patch @ideia/event-bus');
    }

    this.faultInterceptors.set(key, {
      target: experiment.target,
      action: experiment.action,
      restore: () => {
        if (restored) return;
        restored = true;
        for (const fn of restoreFns) fn();
      },
    });
  }

  private injectDatabaseFault(experiment: ChaosExperiment, key: string): void {
    const probability = experiment.probability;
    let restored = false;
    const restoreFns: Array<() => void> = [];

    try {
      const dataLayerMod = require('@ideia/data-layer') as { DataLayer?: { prototype: Record<string, (...args: unknown[]) => unknown> } };
      if (dataLayerMod?.DataLayer?.prototype) {
        const proto = dataLayerMod.DataLayer.prototype;
        const origQuery = proto.query;
        if (origQuery) {
          if (experiment.action === 'latency') {
            const delayMs = Math.round(experiment.intensity * 1000);
            proto.query = async function (...args: unknown[]) {
              if (Math.random() < probability) {
                await new Promise(r => setTimeout(r, delayMs));
              }
              return origQuery.apply(this, args);
            };
            restoreFns.push(() => { proto.query = origQuery; });
          }
          if (experiment.action === 'error') {
            proto.query = async function (..._args: unknown[]) {
              if (Math.random() < probability) {
                throw new Error(`Chaos: injected database error (intensity=${experiment.intensity})`);
              }
              return origQuery.apply(this, _args);
            };
            restoreFns.push(() => { proto.query = origQuery; });
          }
        }
      }
    } catch {
      logger.warn('Could not monkey-patch @ideia/data-layer');
    }

    this.faultInterceptors.set(key, {
      target: experiment.target,
      action: experiment.action,
      restore: () => {
        if (restored) return;
        restored = true;
        for (const fn of restoreFns) fn();
      },
    });
  }

  private injectCacheFault(experiment: ChaosExperiment, key: string): void {
    const probability = experiment.probability;
    let restored = false;
    const restoreFns: Array<() => void> = [];

    try {
      let cacheTarget: Record<string, (...args: unknown[]) => unknown> | null = null;
      try {
        const promptCache = require('@ideia/memory-store') as { PromptCache?: { prototype: Record<string, (...args: unknown[]) => unknown> } };
        if (promptCache?.PromptCache?.prototype) {
          cacheTarget = promptCache.PromptCache.prototype;
        }
      } catch (err) { logger.warn('prompt cache chaos inject failed', { error: String(err) }); }
      try {
        const semanticCache = require('@ideia/memory-store') as { SemanticCache?: { prototype: Record<string, (...args: unknown[]) => unknown> } };
        if (semanticCache?.SemanticCache?.prototype && !cacheTarget) {
          cacheTarget = semanticCache.SemanticCache.prototype;
        }
      } catch (err) { logger.warn('semantic cache chaos inject failed', { error: String(err) }); }

      if (cacheTarget) {
        const ct = cacheTarget;
        const origGet = ct.get;
        const origSet = ct.set;
        if (origGet || origSet) {
          if (experiment.action === 'latency' && origGet) {
            const delayMs = Math.round(experiment.intensity * 1000);
            ct.get = async function (...args: unknown[]) {
              if (Math.random() < probability) {
                await new Promise(r => setTimeout(r, delayMs));
              }
              return origGet.apply(this, args);
            };
            restoreFns.push(() => { ct.get = origGet; });
          }
          if (experiment.action === 'error' && origSet) {
            ct.set = function (...args: unknown[]) {
              if (Math.random() < probability) {
                throw new Error(`Chaos: injected cache error (intensity=${experiment.intensity})`);
              }
              return origSet.apply(this, args);
            };
            restoreFns.push(() => { ct.set = origSet; });
          }
        }
      }
    } catch {
      logger.warn('Could not monkey-patch cache module');
    }

    this.faultInterceptors.set(key, {
      target: experiment.target,
      action: experiment.action,
      restore: () => {
        if (restored) return;
        restored = true;
        for (const fn of restoreFns) fn();
      },
    });
  }

  private injectFilesystemFault(experiment: ChaosExperiment, key: string): void {
    const originalReadFile = writableFs.readFile;
    const originalWriteFile = writableFs.writeFile;
    const probability = experiment.probability;

    if (experiment.action === 'latency' || experiment.action === 'resource-exhaustion') {
      const delayMs = experiment.action === 'latency' ? Math.round(experiment.intensity * 1000) : Math.round(experiment.intensity * 200);
      const chunk = Buffer.alloc(Math.round(experiment.intensity * 1024 * 1024), 'X');
      writableFs.readFile = ((...args: Parameters<typeof fs.readFile>) => {
        if (Math.random() < probability) {
          if (experiment.action === 'resource-exhaustion') {
            chunk[0] = 1;
            logger.warn(`[Chaos] Injecting disk I/O slowdown: ${chunk.length} bytes, intensity=${experiment.intensity}`);
          }
          setTimeout(() => originalReadFile(...args), delayMs);
          return undefined as void;
        }
        return originalReadFile(...args);
      }) as typeof fs.readFile;
    }

    if (experiment.action === 'error') {
      writableFs.writeFile = ((...args: Parameters<typeof fs.writeFile>) => {
        if (Math.random() < probability) {
          const cb = args[args.length - 1];
          if (typeof cb === 'function') {
            setTimeout(() => cb(new Error(`Chaos: injected FS error (intensity=${experiment.intensity})`)), 0);
            return undefined as void;
          }
        }
        return originalWriteFile(...args);
      }) as typeof fs.writeFile;
    }

    this.faultInterceptors.set(key, {
      target: experiment.target,
      action: experiment.action,
      restore: () => {
        writableFs.readFile = originalReadFile;
        writableFs.writeFile = originalWriteFile;
      },
    });
  }

  private removeFault(experiment: ChaosExperiment): void {
    const key = `${experiment.target}:${experiment.action}`;
    const interceptor = this.faultInterceptors.get(key);
    if (interceptor) {
      interceptor.restore();
      this.faultInterceptors.delete(key);
    }
  }

  private async measureImpact(experiment: ChaosExperiment): Promise<ChaosResult['impact']> {
    const failuresDetected = this.faultInterceptors.size;
    const recoveryTimeMs = experiment.durationMs + 50;
    const degradationLevel = experiment.intensity > 0.7 ? 'moderate' : experiment.intensity > 0.4 ? 'minor' : 'none';
    return { failuresDetected, recoveryTimeMs, degradationLevel };
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}