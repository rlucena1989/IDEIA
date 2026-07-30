import { createLogger } from '@ideia/logger';
import type { Logger } from '@ideia/logger';

const SESSION_TTL_MS = 24 * 60 * 60 * 1000;
const TOKEN_BYTES = 32;

interface SessionData {
  token: string;
  userId: string;
  provider: string;
  createdAt: string;
  expiresAt: string;
}

export class SessionManager {
  private sessions: Map<string, SessionData> = new Map();
  private cleanupInterval: ReturnType<typeof setInterval>;
  private logger: Logger;

  constructor(logger?: Logger) {
    this.logger = logger ?? createLogger('theia-cloud:session-manager');
    this.cleanupInterval = setInterval(() => this.cleanupExpired(), 60 * 1000);
  }

  async createSession(userId: string, provider: string): Promise<SessionData> {
    const token = this.generateToken();
    const now = new Date();
    const expiresAt = new Date(now.getTime() + SESSION_TTL_MS);
    const session: SessionData = {
      token,
      userId,
      provider,
      createdAt: now.toISOString(),
      expiresAt: expiresAt.toISOString(),
    };
    this.sessions.set(token, session);
    this.logger.info('Session created', { userId, provider });
    return session;
  }

  async validateSession(token: string): Promise<SessionData | null> {
    const session = this.sessions.get(token);
    if (!session) return null;
    if (new Date(session.expiresAt) < new Date()) {
      this.sessions.delete(token);
      this.logger.info('Session expired', { userId: session.userId });
      return null;
    }
    return session;
  }

  async refreshSession(token: string): Promise<SessionData | null> {
    const session = this.sessions.get(token);
    if (!session) return null;
    if (new Date(session.expiresAt) < new Date()) {
      this.sessions.delete(token);
      return null;
    }
    const now = new Date();
    const expiresAt = new Date(now.getTime() + SESSION_TTL_MS);
    session.createdAt = now.toISOString();
    session.expiresAt = expiresAt.toISOString();
    this.logger.info('Session refreshed', { userId: session.userId });
    return session;
  }

  async revokeSession(token: string): Promise<void> {
    const session = this.sessions.get(token);
    if (session) {
      this.sessions.delete(token);
      this.logger.info('Session revoked', { userId: session.userId });
    }
  }

  private cleanupExpired(): void {
    const now = new Date();
    for (const [token, session] of this.sessions) {
      if (new Date(session.expiresAt) < now) {
        this.sessions.delete(token);
      }
    }
  }

  dispose(): void {
    clearInterval(this.cleanupInterval);
    this.sessions.clear();
  }

  private generateToken(): string {
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < TOKEN_BYTES; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return `sess_${result}`;
  }
}
