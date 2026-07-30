import { EventBus } from '@ideia/event-bus';
import { AuditTrail } from '@ideia/audit-trail';
import { createLogger } from '@ideia/logger';

export interface ContinuityConfig {
  maxPauseMs: number;
  retryIntervalMs: number;
  maxRetries: number;
  autoResume: boolean;
}

export interface ContinuityState {
  paused: boolean;
  pauseReason: string | null;
  pausedAt: string | null;
  resumesScheduled: number;
  resumesExecuted: number;
  retriesRemaining: number;
  lastError: string | null;
}

export interface SchedulerEvent {
  type: 'pause' | 'resume' | 'retry' | 'escalate' | 'timeout';
  timestamp: string;
  reason: string;
}

const DEFAULT_CONFIG: ContinuityConfig = {
  maxPauseMs: 300000,
  retryIntervalMs: 30000,
  maxRetries: 5,
  autoResume: true,
};

export class ContinuityScheduler {
  private config: ContinuityConfig;
  private state: ContinuityState;
  private timer: ReturnType<typeof setTimeout> | null = null;
  private retryCount = 0;
  private events: SchedulerEvent[] = [];
  private bus?: EventBus;
  private audit?: AuditTrail;
  private logger = createLogger('continuity-scheduler');

  constructor(bus?: EventBus, audit?: AuditTrail, config?: Partial<ContinuityConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.bus = bus;
    this.audit = audit;
    this.state = {
      paused: false,
      pauseReason: null,
      pausedAt: null,
      resumesScheduled: 0,
      resumesExecuted: 0,
      retriesRemaining: this.config.maxRetries,
      lastError: null,
    };
  }

  pause(reason: string): ContinuityState {
    this.state.paused = true;
    this.state.pauseReason = reason;
    this.state.pausedAt = new Date().toISOString();
    this.state.retriesRemaining = this.config.maxRetries;
    this.recordEvent('pause', reason);

    if (this.config.autoResume) {
      this.scheduleResume();
    }

    this.emit('control.continuity.paused', { reason });
    this.audit?.append({ actor: 'system', eventType: 'continuity.pause', target: 'system', decision: 'approved', result: 'success', metadata: { reason } });
    this.logger.info(`Continuity paused: ${reason}`);

    return this.getState();
  }

  resume(): ContinuityState {
    if (!this.state.paused) return this.getState();

    this.clearTimer();
    this.state.paused = false;
    this.state.pauseReason = null;
    this.state.pausedAt = null;
    this.state.resumesExecuted++;
    this.state.lastError = null;
    this.retryCount = 0;

    this.recordEvent('resume', 'Manual or scheduled resume');
    this.emit('control.continuity.resumed', {});
    this.audit?.append({ actor: 'system', eventType: 'continuity.resume', target: 'system', decision: 'approved', result: 'success' });
    this.logger.info('Continuity resumed');

    return this.getState();
  }

  retry(operation: () => Promise<boolean>): Promise<boolean> {
    this.retryCount++;
    this.state.retriesRemaining = this.config.maxRetries - this.retryCount;

    if (this.retryCount > this.config.maxRetries) {
      this.state.lastError = 'Max retries exceeded';
      this.recordEvent('escalate', 'Max retries exceeded, escalating to human');
      this.emit('control.continuity.escalated', { retries: this.retryCount });
      return Promise.resolve(false);
    }

    this.recordEvent('retry', `Retry ${this.retryCount}/${this.config.maxRetries}`);

    return operation().then(success => {
      if (success) {
        this.retryCount = 0;
        this.state.retriesRemaining = this.config.maxRetries;
        this.state.lastError = null;
      } else {
        this.state.lastError = `Retry ${this.retryCount} failed`;
      }
      return success;
    });
  }

  getState(): ContinuityState {
    return { ...this.state };
  }

  getEvents(): SchedulerEvent[] {
    return [...this.events];
  }

  getConfig(): ContinuityConfig {
    return { ...this.config };
  }

  dispose(): void {
    this.clearTimer();
    this.events = [];
  }

  private scheduleResume(): void {
    this.clearTimer();
    this.state.resumesScheduled++;
    this.timer = setTimeout(() => {
      this.resume();
    }, this.config.maxPauseMs);
    this.logger.info(`Auto-resume scheduled in ${this.config.maxPauseMs}ms`);
  }

  private clearTimer(): void {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
  }

  private recordEvent(type: SchedulerEvent['type'], reason: string): void {
    this.events.push({ type, timestamp: new Date().toISOString(), reason });
  }

  private emit(type: string, payload: Record<string, unknown>): void {
    this.bus?.emit({ type, source: 'continuity-scheduler', payload }).catch(() => {});
  }
}

export function createContinuityScheduler(bus?: EventBus, audit?: AuditTrail, config?: Partial<ContinuityConfig>): ContinuityScheduler {
  return new ContinuityScheduler(bus, audit, config);
}
