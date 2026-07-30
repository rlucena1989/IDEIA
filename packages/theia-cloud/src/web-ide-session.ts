import { createLogger } from '@ideia/logger';
import type { Logger } from '@ideia/logger';
import type {
  Session,
  SessionConfig,
} from './types-remote';

export class WebIDESession {
  private sessions: Map<string, Session> = new Map();
  private cleanupInterval: ReturnType<typeof setInterval>;
  private logger: Logger;

  constructor(logger?: Logger) {
    this.logger = logger ?? createLogger('theia-cloud:web-ide-session');
    this.cleanupInterval = setInterval(() => this.cleanupExpired(), 60 * 1000);
  }

  createSession(userId: string, workspaceId: string, config?: Partial<SessionConfig>): Session {
    const id = `ses-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    const now = Date.now();
    const sessionConfig: SessionConfig = {
      userId,
      workspaceId,
      token: crypto.randomUUID(),
      expiry: config?.expiry ?? now + 24 * 60 * 60 * 1000,
      authProvider: config?.authProvider ?? 'github',
    };
    const session: Session = {
      id,
      config: sessionConfig,
      status: 'active',
      createdAt: now,
      lastActivity: now,
      ip: config?.token ?? '',
    };
    this.sessions.set(id, session);
    this.logger.info('Web IDE session created', { sessionId: id, userId, workspaceId });
    return session;
  }

  validateSession(token: string): Session | undefined {
    for (const session of this.sessions.values()) {
      if (session.config.token === token) {
        if (session.status !== 'active') {
          return undefined;
        }
        if (Date.now() > session.config.expiry) {
          session.status = 'expired';
          this.sessions.delete(session.id);
          return undefined;
        }
        session.lastActivity = Date.now();
        return session;
      }
    }
    return undefined;
  }

  revokeSession(sessionId: string): boolean {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return false;
    }
    session.status = 'revoked';
    this.sessions.delete(sessionId);
    this.logger.info('Web IDE session revoked', { sessionId });
    return true;
  }

  listActiveSessions(): Session[] {
    return Array.from(this.sessions.values()).filter((s) => s.status === 'active');
  }

  getSession(sessionId: string): Session | undefined {
    return this.sessions.get(sessionId);
  }

  dispose(): void {
    clearInterval(this.cleanupInterval);
    this.sessions.clear();
  }

  private cleanupExpired(): void {
    const now = Date.now();
    for (const [id, session] of this.sessions) {
      if (now > session.config.expiry) {
        session.status = 'expired';
        this.sessions.delete(id);
      }
    }
  }
}
