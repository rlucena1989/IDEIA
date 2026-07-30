import type { ActiveSession, BrowserControllerConfig } from './browser-controller';
import { createLogger } from '@ideia/logger';
import { BrowserController } from './browser-controller';
const logger = createLogger('session-manager');

export interface SessionPoolConfig {
  maxSessions?: number;
  idleTimeoutMs?: number;
  healthCheckIntervalMs?: number;
}

export class SessionManager {
  private controller: BrowserController;
  private sessions: Map<string, ActiveSession> = new Map();
  private maxSessions: number;
  private idleTimeoutMs: number;
  private healthCheckIntervalMs: number;
  private healthCheckTimer: ReturnType<typeof setInterval> | null = null;
  private idleTimers: Map<string, ReturnType<typeof setTimeout>> = new Map();

  constructor(
    browserConfig: BrowserControllerConfig = {},
    poolConfig: SessionPoolConfig = {},
  ) {
    this.controller = new BrowserController(browserConfig);
    this.maxSessions = poolConfig.maxSessions ?? 3;
    this.idleTimeoutMs = poolConfig.idleTimeoutMs ?? 5 * 60 * 1000;
    this.healthCheckIntervalMs = poolConfig.healthCheckIntervalMs ?? 30 * 1000;
  }

  async acquireSession(): Promise<ActiveSession> {
    for (const [id, session] of this.sessions) {
      if (!session.page.isClosed()) {
        this.refreshIdleTimer(id, session);
        return session;
      }
    }

    if (this.sessions.size >= this.maxSessions) {
      const oldest = this.sessions.entries().next().value;
      if (oldest) {
        await this.releaseSession(oldest[0]);
      }
    }

    const session = await this.controller.createSession();
    this.sessions.set(session.id, session);
    this.refreshIdleTimer(session.id, session);
    this.startHealthCheck();
    return session;
  }

  async releaseSession(id: string): Promise<void> {
    const timer = this.idleTimers.get(id);
    if (timer) clearTimeout(timer);
    this.idleTimers.delete(id);
    await this.controller.closeSession(id).catch(() => {});
    this.sessions.delete(id);
    if (this.sessions.size === 0) this.stopHealthCheck();
  }

  getSession(id: string): ActiveSession | undefined {
    const session = this.sessions.get(id);
    if (session) this.refreshIdleTimer(id, session);
    return session;
  }

  listSessions(): ActiveSession[] {
    return Array.from(this.sessions.values());
  }

  async closeAll(): Promise<void> {
    this.stopHealthCheck();
    for (const [id] of this.sessions) {
      const timer = this.idleTimers.get(id);
      if (timer) clearTimeout(timer);
      await this.controller.closeSession(id).catch(() => {});
    }
    this.idleTimers.clear();
    this.sessions.clear();
    await this.controller.close().catch(() => {});
  }

  getHealth(): { activeSessions: number; maxSessions: number; ready: boolean } {
    return {
      activeSessions: this.sessions.size,
      maxSessions: this.maxSessions,
      ready: true,
    };
  }

  private refreshIdleTimer(id: string, _session: ActiveSession): void {
    const existing = this.idleTimers.get(id);
    if (existing) clearTimeout(existing);
    const timer = setTimeout(async () => {
      try {
        await this.releaseSession(id);
      } catch { /* cleanup */ }
    }, this.idleTimeoutMs);
    timer.unref();
    this.idleTimers.set(id, timer);
  }

  private startHealthCheck(): void {
    if (this.healthCheckTimer) return;
    this.healthCheckTimer = setInterval(async () => {
      for (const [id, session] of this.sessions) {
        try {
          if (session.page.isClosed()) {
            this.sessions.delete(id);
            const timer = this.idleTimers.get(id);
            if (timer) clearTimeout(timer);
            this.idleTimers.delete(id);
          }
        } catch {
          this.sessions.delete(id);
        }
      }
    }, this.healthCheckIntervalMs);
    this.healthCheckTimer.unref();
  }

  private stopHealthCheck(): void {
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer);
      this.healthCheckTimer = null;
    }
  }
}
