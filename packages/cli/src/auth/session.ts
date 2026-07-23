import { createLogger } from '@ideia/logger';
import { AppError } from '@ideia/contracts';

const log = createLogger('session-manager');

export interface Session {
  id: string;
  userId: string;
  createdAt: number;
  expiresAt: number;
  refreshToken: string;
  lastActivityAt: number;
  metadata?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
}

export interface SessionConfig {
  sessionTTLMs: number;
  refreshTTLMs: number;
  maxSessionsPerUser: number;
  extendOnActivity: boolean;
}

const DEFAULT_CONFIG: SessionConfig = {
  sessionTTLMs: 24 * 60 * 60 * 1000,
  refreshTTLMs: 7 * 24 * 60 * 60 * 1000,
  maxSessionsPerUser: 5,
  extendOnActivity: true,
};

const SESSION_ID_LENGTH = 32;
const REFRESH_TOKEN_LENGTH = 48;

function generateId(length: number): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

export class SessionManager {
  private sessions: Map<string, Session> = new Map();
  private userSessions: Map<string, Set<string>> = new Map();
  private config: SessionConfig;

  constructor(config?: Partial<SessionConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  async createSession(userId: string, metadata?: Record<string, unknown>): Promise<Session> {
    log.info('Creating session', { userId });

    const userActiveSessions = this.userSessions.get(userId);
    if (userActiveSessions && userActiveSessions.size >= this.config.maxSessionsPerUser) {
      const oldest = Array.from(userActiveSessions)
        .map(id => this.sessions.get(id))
        .filter((s): s is Session => !!s)
        .sort((a, b) => a.createdAt - b.createdAt)[0];

      if (oldest) {
        this.revokeSession(oldest.id);
        log.warn('Max sessions reached, revoked oldest', {
          userId,
          revokedSession: oldest.id,
        });
      }
    }

    const now = Date.now();
    const session: Session = {
      id: `sess_${generateId(SESSION_ID_LENGTH)}`,
      userId,
      createdAt: now,
      expiresAt: now + this.config.sessionTTLMs,
      refreshToken: `ref_${generateId(REFRESH_TOKEN_LENGTH)}`,
      lastActivityAt: now,
      metadata,
    };

    this.sessions.set(session.id, session);

    let userSet = this.userSessions.get(userId);
    if (!userSet) {
      userSet = new Set();
      this.userSessions.set(userId, userSet);
    }
    userSet.add(session.id);

    log.info('Session created', { sessionId: session.id, userId });
    return session;
  }

  async refreshSession(sessionId: string): Promise<Session> {
    log.info('Refreshing session', { sessionId });

    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new AppError('SESSION_NOT_FOUND', 'Session not found for refresh');
    }

    if (Date.now() > session.expiresAt + this.config.refreshTTLMs) {
      this.revokeSession(sessionId);
      throw new AppError('REFRESH_EXPIRED', 'Refresh window has expired');
    }

    const now = Date.now();
    const newSession: Session = {
      ...session,
      id: `sess_${generateId(SESSION_ID_LENGTH)}`,
      createdAt: now,
      expiresAt: now + this.config.sessionTTLMs,
      refreshToken: `ref_${generateId(REFRESH_TOKEN_LENGTH)}`,
      lastActivityAt: now,
    };

    this.sessions.set(newSession.id, newSession);

    const userSet = this.userSessions.get(session.userId);
    if (userSet) {
      userSet.delete(sessionId);
      userSet.add(newSession.id);
    }

    this.sessions.delete(sessionId);
    log.info('Session refreshed', {
      oldSession: sessionId,
      newSession: newSession.id,
    });

    return newSession;
  }

  async validateSession(sessionId: string): Promise<Session> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new AppError('SESSION_NOT_FOUND', 'Session not found');
    }

    if (Date.now() > session.expiresAt) {
      this.revokeSession(sessionId);
      throw new AppError('SESSION_EXPIRED', 'Session has expired');
    }

    if (this.config.extendOnActivity) {
      session.lastActivityAt = Date.now();
    }

    return session;
  }

  async revokeSession(sessionId: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    this.sessions.delete(sessionId);

    const userSet = this.userSessions.get(session.userId);
    if (userSet) {
      userSet.delete(sessionId);
      if (userSet.size === 0) {
        this.userSessions.delete(session.userId);
      }
    }

    log.info('Session revoked', { sessionId, userId: session.userId });
  }

  async revokeAllUserSessions(userId: string): Promise<number> {
    const userSet = this.userSessions.get(userId);
    if (!userSet) return 0;

    let count = 0;
    for (const sessionId of userSet) {
      this.sessions.delete(sessionId);
      count++;
    }

    this.userSessions.delete(userId);
    log.info('All user sessions revoked', { userId, count });
    return count;
  }

  async getUserSessions(userId: string): Promise<Session[]> {
    const userSet = this.userSessions.get(userId);
    if (!userSet) return [];

    const now = Date.now();
    return Array.from(userSet)
      .map(id => this.sessions.get(id))
      .filter((s): s is Session => !!s && s.expiresAt > now);
  }

  updateConfig(config: Partial<SessionConfig>): void {
    this.config = { ...this.config, ...config };
    log.info('Session config updated', this.config);
  }

  getConfig(): SessionConfig {
    return { ...this.config };
  }

  getActiveSessionCount(): number {
    const now = Date.now();
    let count = 0;
    for (const session of this.sessions.values()) {
      if (session.expiresAt > now) count++;
    }
    return count;
  }
}

let globalSessionManager: SessionManager | null = null;

export function getSessionManager(config?: Partial<SessionConfig>): SessionManager {
  if (!globalSessionManager) {
    globalSessionManager = new SessionManager(config);
  }
  return globalSessionManager;
}

export async function createSession(
  userId: string,
  metadata?: Record<string, unknown>
): Promise<Session> {
  return getSessionManager().createSession(userId, metadata);
}

export async function refreshSession(sessionId: string): Promise<Session> {
  return getSessionManager().refreshSession(sessionId);
}

export async function validateSession(sessionId: string): Promise<Session> {
  return getSessionManager().validateSession(sessionId);
}

export async function revokeSession(sessionId: string): Promise<void> {
  return getSessionManager().revokeSession(sessionId);
}
