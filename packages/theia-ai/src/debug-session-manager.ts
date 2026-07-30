import { createLogger, Logger } from '@ideia/logger';
import {
  DebugSession,
  DebugSessionConfig,
  SessionMetrics,
  SessionStatus,
} from './types-debugger';

function generateId(): string {
  return 'sess-' + Date.now() + '-' + Math.random().toString(36).slice(2, 9);
}

const DEFAULT_CONFIG: DebugSessionConfig = {
  captureThoughts: true,
  captureState: true,
  captureToolCalls: true,
  captureLLM: true,
  maxTraceRecords: 10000,
  breakOnError: false,
  maskSensitiveData: true,
};

export class DebugSessionManager {
  private sessions = new Map<string, DebugSession>();
  private logger: Logger;
  private maxActiveSessions: number;

  constructor(maxActiveSessions = 10) {
    this.logger = createLogger('DebugSessionManager');
    this.maxActiveSessions = maxActiveSessions;
  }

  createSession(config: DebugSessionConfig): DebugSession {
    const activeCount = this.getActiveSessions().length;
    if (activeCount >= this.maxActiveSessions) {
      throw new Error(`Max active sessions (${this.maxActiveSessions}) reached`);
    }

    const id = generateId();
    const mergedConfig: DebugSessionConfig = {
      ...DEFAULT_CONFIG,
      ...config,
    };
    const metrics: SessionMetrics = {
      totalSteps: 0,
      totalTokens: 0,
      totalDuration: 0,
      maxStepDuration: 0,
      avgStepDuration: 0,
      toolCallCount: 0,
      llmCallCount: 0,
    };
    const session: DebugSession = {
      id,
      agentId: '',
      agentType: '',
      startTime: Date.now(),
      status: 'running',
      config: mergedConfig,
      metrics,
      metadata: {},
    };
    this.sessions.set(id, session);
    this.logger.info('Session created', { sessionId: id });
    return session;
  }

  destroySession(sessionId: string): boolean {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.endTime = Date.now();
      session.status = 'cancelled';
      this.sessions.delete(sessionId);
      this.logger.info('Session destroyed', { sessionId });
      return true;
    }
    return false;
  }

  pauseSession(sessionId: string): boolean {
    const session = this.sessions.get(sessionId);
    if (!session || session.status !== 'running') return false;
    session.status = 'paused';
    this.logger.info('Session paused', { sessionId });
    return true;
  }

  resumeSession(sessionId: string): boolean {
    const session = this.sessions.get(sessionId);
    if (!session || session.status !== 'paused') return false;
    session.status = 'running';
    this.logger.info('Session resumed', { sessionId });
    return true;
  }

  updateSessionStatus(sessionId: string, status: SessionStatus): boolean {
    const session = this.sessions.get(sessionId);
    if (!session) return false;
    session.status = status;
    if (status === 'completed' || status === 'failed' || status === 'cancelled') {
      session.endTime = Date.now();
    }
    this.logger.info('Session status updated', { sessionId, status });
    return true;
  }

  getActiveSessions(): DebugSession[] {
    return Array.from(this.sessions.values()).filter(
      s => s.status === 'running' || s.status === 'paused'
    );
  }

  getSession(sessionId: string): DebugSession | undefined {
    return this.sessions.get(sessionId);
  }

  listSessions(): DebugSession[] {
    return Array.from(this.sessions.values());
  }

  enforceMaxSessions(max: number): void {
    this.maxActiveSessions = max;
    const active = this.getActiveSessions();
    if (active.length > max) {
      const toRemove = active.slice(0, active.length - max);
      for (const s of toRemove) {
        this.destroySession(s.id);
      }
    }
  }
}
