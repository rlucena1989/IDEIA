import { randomUUID } from 'crypto';
import { createLogger } from '@ideia/logger';
import { BHPPlatform, BHPMessage } from './types';

const log = createLogger('bhp:session-manager');

export type SessionStatus = 'active' | 'awaiting_response' | 'completed' | 'failed' | 'timed_out';

export interface BHPSession {
  id: string;
  source: BHPPlatform;
  target: BHPPlatform;
  intent: string;
  status: SessionStatus;
  messages: BHPMessage[];
  createdAt: string;
  updatedAt: string;
  context: Record<string, unknown>;
}

export class SessionManager {
  private sessions: Map<string, BHPSession> = new Map();
  private maxSessions = 100;

  createSession(source: BHPPlatform, target: BHPPlatform, intent: string, context?: Record<string, unknown>): BHPSession {
    if (this.sessions.size >= this.maxSessions) {
      const oldest = Array.from(this.sessions.entries())
        .sort(([, a], [, b]) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())[0];
      if (oldest) {
        this.sessions.delete(oldest[0]);
      }
    }

    const now = new Date().toISOString();
    const session: BHPSession = {
      id: randomUUID(),
      source,
      target,
      intent,
      status: 'active',
      messages: [],
      createdAt: now,
      updatedAt: now,
      context: context ?? {},
    };

    this.sessions.set(session.id, session);
    log.info(`Session created: ${session.id} (${source} -> ${target})`);
    return session;
  }

  addMessage(sessionId: string, message: BHPMessage): boolean {
    const session = this.sessions.get(sessionId);
    if (!session) return false;

    session.messages.push(message);
    session.updatedAt = new Date().toISOString();
    return true;
  }

  updateStatus(sessionId: string, status: SessionStatus): boolean {
    const session = this.sessions.get(sessionId);
    if (!session) return false;

    session.status = status;
    session.updatedAt = new Date().toISOString();
    return true;
  }

  getSession(sessionId: string): BHPSession | undefined {
    return this.sessions.get(sessionId);
  }

  getSessionsByStatus(status: SessionStatus): BHPSession[] {
    return Array.from(this.sessions.values()).filter(s => s.status === status);
  }

  getSessionsBySource(source: BHPPlatform): BHPSession[] {
    return Array.from(this.sessions.values()).filter(s => s.source === source || s.target === source);
  }

  getAllSessions(): BHPSession[] {
    return Array.from(this.sessions.values());
  }

  getActiveCount(): number {
    return Array.from(this.sessions.values()).filter(s => s.status === 'active' || s.status === 'awaiting_response').length;
  }

  removeSession(sessionId: string): boolean {
    return this.sessions.delete(sessionId);
  }

  clearCompleted(): void {
    for (const [id, session] of this.sessions) {
      if (session.status === 'completed' || session.status === 'failed' || session.status === 'timed_out') {
        this.sessions.delete(id);
      }
    }
  }
}

export function createSessionManager(): SessionManager {
  return new SessionManager();
}
