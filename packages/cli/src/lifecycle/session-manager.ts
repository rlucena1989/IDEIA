import { randomUUID } from 'crypto';
import { createLogger } from '@ideia/logger';
import type { IEventBus } from '@ideia/event-bus';
import { SessionObserver } from '@ideia/observability-engine';

const log = createLogger('session-manager');

export interface SessionInfo {
  sessionId: string;
  startedAt: string;
  endedAt?: string;
  metadata: Record<string, unknown>;
}

export class SessionManager {
  private sessions: Map<string, SessionInfo> = new Map();
  private eventBus: IEventBus | null = null;
  private observer: SessionObserver | null = null;

  setEventBus(eventBus: IEventBus): void {
    this.eventBus = eventBus;
  }

  setObserver(observer: SessionObserver): void {
    this.observer = observer;
  }

  createSession(metadata?: Record<string, unknown>): string {
    const sessionId = randomUUID();
    const info: SessionInfo = {
      sessionId,
      startedAt: new Date().toISOString(),
      metadata: metadata ?? {},
    };
    this.sessions.set(sessionId, info);

    if (this.observer) {
      this.observer.onSessionCreated(sessionId, metadata);
    }

    if (this.eventBus) {
      this.eventBus.emit({
        type: 'session:created',
        source: 'session-manager',
        payload: { sessionId, startedAt: info.startedAt, metadata: info.metadata },
        metadata: { timestamp: info.startedAt },
      }).catch((err: any) => log.error('Failed to emit session:created', { error: String(err) }));
    }

    log.info('Session created', { sessionId });
    return sessionId;
  }

  endSession(sessionId: string): SessionInfo | undefined {
    const info = this.sessions.get(sessionId);
    if (!info) {
      log.warn('Attempted to end unknown session', { sessionId });
      return undefined;
    }
    info.endedAt = new Date().toISOString();

    if (this.observer) {
      this.observer.onSessionEnd(sessionId);
    }

    if (this.eventBus) {
      this.eventBus.emit({
        type: 'session:ended',
        source: 'session-manager',
        payload: { sessionId, endedAt: info.endedAt, duration: new Date(info.endedAt).getTime() - new Date(info.startedAt).getTime() },
        metadata: { timestamp: info.endedAt },
      }).catch((err: any) => log.error('Failed to emit session:ended', { error: String(err) }));
    }

    return { ...info };
  }

  recordCommand(sessionId: string, command: string): void {
    if (this.observer) {
      this.observer.onSessionCommand(sessionId, command);
    }
  }

  recordError(sessionId: string, error: string): void {
    if (this.observer) {
      this.observer.onSessionError(sessionId, error);
    }
  }

  getSession(sessionId: string): SessionInfo | undefined {
    return this.sessions.get(sessionId);
  }

  getActiveSessions(): SessionInfo[] {
    const result: SessionInfo[] = [];
    for (const info of this.sessions.values()) {
      if (!info.endedAt) result.push({ ...info });
    }
    return result;
  }

  clear(): void {
    this.sessions.clear();
  }
}

export function createSessionManager(): SessionManager {
  return new SessionManager();
}
