import { Emitter } from '@ideia/core-contributions';
import { AuthUser, AuthSession, AuthProvider } from './types';

export class DefaultAuthProvider implements AuthProvider {
  readonly id: string;
  readonly name: string;
  private sessions = new Map<string, AuthSession>();

  constructor(id: string, name: string) {
    this.id = id;
    this.name = name;
  }

  async login(credentials?: Record<string, string>): Promise<AuthSession> {
    const session: AuthSession = {
      id: `session-${Date.now()}`,
      userId: credentials?.email || 'anonymous',
      token: `token-${Date.now()}`,
      refreshToken: `refresh-${Date.now()}`,
      expiresAt: new Date(Date.now() + 3600000),
      scopes: ['read'],
    };
    this.sessions.set(session.id, session);
    return session;
  }

  async logout(sessionId: string): Promise<void> {
    this.sessions.delete(sessionId);
  }

  async refreshToken(refreshToken: string): Promise<AuthSession> {
    return this.login();
  }

  async getUser(session: AuthSession): Promise<AuthUser> {
    return {
      id: session.userId,
      email: `${session.userId}@ideia.dev`,
      name: session.userId,
      roles: ['user'],
      organizations: [],
      mfaEnabled: false,
      createdAt: new Date(),
    };
  }
}
