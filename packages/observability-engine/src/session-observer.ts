import { createLogger, Logger } from '@ideia/logger';
import { ObservabilityEngine } from './observability-engine';

const log = createLogger('session-observer');

export interface SessionInfo {
  sessionId: string;
  startedAt: string;
  endedAt?: string;
  durationMs?: number;
  commandCount: number;
  errorCount: number;
  commands: string[];
  errors: string[];
  metadata: Record<string, unknown>;
}

export class SessionObserver {
  private sessions: Map<string, SessionInfo> = new Map();
  private engine: ObservabilityEngine;
  private logger: Logger;

  constructor(engine: ObservabilityEngine, logger?: Logger) {
    this.engine = engine;
    this.logger = logger ?? log;
  }

  onSessionCreated(sessionId: string, metadata?: Record<string, unknown>): void {
    const info: SessionInfo = {
      sessionId,
      startedAt: new Date().toISOString(),
      commandCount: 0,
      errorCount: 0,
      commands: [],
      errors: [],
      metadata: metadata ?? {},
    };
    this.sessions.set(sessionId, info);
    this.engine.recordMetric('session.created', 1, { sessionId });
    this.logger.info('Session created', { sessionId });
  }

  onSessionCommand(sessionId: string, command: string): void {
    const info = this.sessions.get(sessionId);
    if (!info) return;
    info.commandCount++;
    if (info.commands.length < 1000) {
      info.commands.push(command);
    }
    this.engine.recordMetric('session.command', 1, { sessionId });
  }

  onSessionError(sessionId: string, error: string): void {
    const info = this.sessions.get(sessionId);
    if (!info) return;
    info.errorCount++;
    if (info.errors.length < 100) {
      info.errors.push(error);
    }
    this.engine.recordMetric('session.error', 1, { sessionId });
    this.logger.warn('Session error', { sessionId, error });
  }

  onSessionEnd(sessionId: string): SessionInfo | undefined {
    const info = this.sessions.get(sessionId);
    if (!info) return undefined;
    info.endedAt = new Date().toISOString();
    info.durationMs = new Date(info.endedAt).getTime() - new Date(info.startedAt).getTime();
    this.engine.recordMetric('session.ended', 1, { sessionId });
    this.engine.recordMetric('session.duration_ms', info.durationMs, { sessionId });
    this.engine.recordMetric('session.commands_total', info.commandCount, { sessionId });
    this.engine.recordMetric('session.errors_total', info.errorCount, { sessionId });
    this.logger.info('Session ended', { sessionId, durationMs: info.durationMs, commands: info.commandCount, errors: info.errorCount });
    return { ...info };
  }

  getSession(sessionId: string): SessionInfo | undefined {
    return this.sessions.get(sessionId);
  }

  getActiveSessions(): SessionInfo[] {
    const result: SessionInfo[] = [];
    for (const info of this.sessions.values()) {
      if (!info.endedAt) {
        result.push({ ...info });
      }
    }
    return result;
  }

  getSessionSummary(): { total: number; active: number; completed: number; totalCommands: number; totalErrors: number } {
    let active = 0;
    let completed = 0;
    let totalCommands = 0;
    let totalErrors = 0;
    for (const info of this.sessions.values()) {
      if (info.endedAt) {
        completed++;
      } else {
        active++;
      }
      totalCommands += info.commandCount;
      totalErrors += info.errorCount;
    }
    return { total: this.sessions.size, active, completed, totalCommands, totalErrors };
  }

  clear(): void {
    this.sessions.clear();
  }
}

export function createSessionObserver(engine: ObservabilityEngine): SessionObserver {
  return new SessionObserver(engine);
}
