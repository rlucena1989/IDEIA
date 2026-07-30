import { BulkheadConfig, DegradationAction, DegradationMode, ResiliencePolicy, ResilienceReport as _ResilienceReport } from './types';
import { createLogger } from '@ideia/logger';

export { DegradationMode };
const MODE_ACTIONS: Record<DegradationMode, DegradationAction> = {
  normal: { mode: 'normal', disableFeatures: [], reduceConcurrency: 0, readOnly: false, notify: false },
  degraded: { mode: 'degraded', disableFeatures: ['chat_history', 'analytics'], reduceConcurrency: 0.5, readOnly: false, notify: true },
  limited: { mode: 'limited', disableFeatures: ['chat_history', 'analytics', 'auto_complete', 'suggestions'], reduceConcurrency: 0.75, readOnly: false, notify: true },
  emergency: { mode: 'emergency', disableFeatures: ['agents', 'chat', 'auto_complete', 'suggestions', 'analytics', 'git'], reduceConcurrency: 1, readOnly: true, notify: true },
  offline: { mode: 'offline', disableFeatures: ['all'], reduceConcurrency: 1, readOnly: true, notify: true },
};
interface QueueItem {
  resolve: () => void;
  reject: (err: Error) => void;
  enqueuedAt: number;
}

export class Bulkhead {
  private active = 0;
  private queue: QueueItem[] = [];
  private ttlMs: number;

  constructor(private config: BulkheadConfig) {
    this.ttlMs = config.ttlMs ?? 30000;
  }

  async run<T>(fn: () => Promise<T>): Promise<T> {
    if (this.active >= this.config.maxConcurrent) {
      this.evictExpired();
      if (this.queue.length >= 100) throw new Error(`Bulkhead ${this.config.name} queue full`);
      await new Promise<T>((resolve, reject) => {
        this.queue.push({ resolve: () => resolve(undefined as T), reject, enqueuedAt: Date.now() });
      });
    }
    this.active++;
    let result: T | undefined;
    let error: unknown;
    try {
      result = await Promise.race([
        fn(),
        new Promise<T>((_, rej) => setTimeout(() => rej(new Error(`Bulkhead ${this.config.name} timeout`)), this.config.timeoutMs)),
      ]);
    } catch (e) {
      error = e;
    } finally {
      this.active--;
    }
    if (this.queue.length > 0) {
      const next = this.queue.shift() as QueueItem;
      if (Date.now() - next.enqueuedAt > this.ttlMs) {
        next.reject(new Error(`Bulkhead ${this.config.name} queue item expired`));
        return this.run(fn);
      }
      next.resolve();
    }
    if (error) throw error;
    if (result === undefined) throw new Error('Bulkhead: result is undefined');
    return result;
  }

  private evictExpired(): void {
    const now = Date.now();
    this.queue = this.queue.filter(item => now - item.enqueuedAt <= this.ttlMs);
  }

  get utilization(): number { return this.active / this.config.maxConcurrent; }
  get activeCount(): number { return this.active; }
}
export class DegradationManager {
  private currentMode: DegradationMode = 'normal';
  private modeHistory: { mode: DegradationMode; timestamp: string }[] = [];
  get mode(): DegradationMode { return this.currentMode; }
  getAction(): DegradationAction { return MODE_ACTIONS[this.currentMode]; }
  setMode(mode: DegradationMode): void {
    this.currentMode = mode; this.modeHistory.push({ mode, timestamp: new Date().toISOString() });
  }
  get isReadOnly(): boolean { return MODE_ACTIONS[this.currentMode].readOnly; }
  isFeatureEnabled(feature: string): boolean { return !MODE_ACTIONS[this.currentMode].disableFeatures.includes(feature) && !MODE_ACTIONS[this.currentMode].disableFeatures.includes('all'); }
  getHistory(): { mode: DegradationMode; timestamp: string }[] { return [...this.modeHistory]; }
}
export function executeWithPolicy<T>(fn: () => Promise<T>, policy: ResiliencePolicy, bulkhead?: Bulkhead): Promise<T> {
  const executor = async (attempt: number): Promise<T> => {
    try {
      if (bulkhead) return await bulkhead.run(fn);
      return await fn();
    } catch (e) {
      if (attempt >= policy.maxRetries) throw e;
      const delay = policy.baseDelayMs * Math.pow(2, attempt);
      await new Promise(r => setTimeout(r, Math.min(delay, 30000)));
      return executor(attempt + 1);
    }
  };
  return executor(0);
}
export function createBulkhead(config: BulkheadConfig): Bulkhead { return new Bulkhead(config); }
export function createDegradationManager(): DegradationManager { return new DegradationManager(); }
