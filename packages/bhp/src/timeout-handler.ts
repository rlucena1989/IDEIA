import { createLogger } from '@ideia/logger';
import { SessionManager, SessionStatus } from './session-manager';

const log = createLogger('bhp:timeout-handler');

export interface TimeoutConfig {
  responseTimeoutMs: number;
  maxRetries: number;
  retryDelayMs: number;
}

const DEFAULT_CONFIG: TimeoutConfig = {
  responseTimeoutMs: 30000,
  maxRetries: 3,
  retryDelayMs: 5000,
};

export interface TimeoutResult {
  sessionId: string;
  retriesAttempted: number;
  resolved: boolean;
  finalStatus: SessionStatus;
}

export class TimeoutHandler {
  private sessionManager: SessionManager;
  private config: TimeoutConfig;
  private timers: Map<string, ReturnType<typeof setTimeout>> = new Map();
  private retryCounters: Map<string, number> = new Map();

  constructor(sessionManager: SessionManager, config?: Partial<TimeoutConfig>) {
    this.sessionManager = sessionManager;
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  startTimer(sessionId: string): void {
    this.clearTimer(sessionId);

    const timer = setTimeout(() => {
      this.handleTimeout(sessionId);
    }, this.config.responseTimeoutMs);

    this.timers.set(sessionId, timer);
    this.retryCounters.set(sessionId, 0);
  }

  refreshTimer(sessionId: string): void {
    const retries = this.retryCounters.get(sessionId) ?? 0;
    if (retries < this.config.maxRetries) {
      this.startTimer(sessionId);
    }
  }

  cancelTimer(sessionId: string): void {
    this.clearTimer(sessionId);
    this.retryCounters.delete(sessionId);
  }

  resolveSession(sessionId: string): TimeoutResult {
    const retries = this.retryCounters.get(sessionId) ?? 0;
    this.clearTimer(sessionId);
    this.retryCounters.delete(sessionId);

    this.sessionManager.updateStatus(sessionId, 'completed');
    return {
      sessionId,
      retriesAttempted: retries,
      resolved: true,
      finalStatus: 'completed',
    };
  }

  private handleTimeout(sessionId: string): void {
    const retries = this.retryCounters.get(sessionId) ?? 0;
    log.warn(`Session ${sessionId} timed out (retry ${retries}/${this.config.maxRetries})`);

    if (retries < this.config.maxRetries) {
      this.retryCounters.set(sessionId, retries + 1);
      this.sessionManager.updateStatus(sessionId, 'awaiting_response');

      const retryTimer = setTimeout(() => {
        this.handleTimeout(sessionId);
      }, this.config.retryDelayMs);

      this.timers.set(sessionId, retryTimer);
    } else {
      this.sessionManager.updateStatus(sessionId, 'timed_out');
      this.retryCounters.delete(sessionId);

      const fallbackTimer = setTimeout(() => {
        this.sessionManager.updateStatus(sessionId, 'failed');
        log.warn(`Session ${sessionId}: all retries exhausted, fallback to human`);
      }, 1000);

      this.timers.set(sessionId, fallbackTimer);
    }
  }

  getRetryCount(sessionId: string): number {
    return this.retryCounters.get(sessionId) ?? 0;
  }

  dispose(): void {
    for (const [id] of this.timers) {
      this.clearTimer(id);
    }
    this.retryCounters.clear();
  }

  private clearTimer(sessionId: string): void {
    const timer = this.timers.get(sessionId);
    if (timer) {
      clearTimeout(timer);
      this.timers.delete(sessionId);
    }
  }
}

export function createTimeoutHandler(sessionManager: SessionManager, config?: Partial<TimeoutConfig>): TimeoutHandler {
  return new TimeoutHandler(sessionManager, config);
}
