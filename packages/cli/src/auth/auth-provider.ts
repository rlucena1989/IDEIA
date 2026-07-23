import { createLogger } from '@ideia/logger';
import { AppError } from '@ideia/contracts';

const log = createLogger('auth-provider');

export type AuthProviderType = 'clerk' | 'oauth2' | 'none';

export interface User {
  id: string;
  email: string;
  name: string;
  avatarUrl?: string;
  roles: string[];
  metadata?: Record<string, unknown>;
}

export interface Session {
  id: string;
  userId: string;
  accessToken: string;
  refreshToken?: string;
  expiresAt: number;
  createdAt: number;
}

export interface AuthConfig {
  provider: AuthProviderType;
  clientId?: string;
  clientSecret?: string;
  issuerUrl?: string;
  redirectUri?: string;
  scopes?: string[];
  clerkApiKey?: string;
}

export interface AuthProvider {
  login(credentials?: Record<string, string>): Promise<Session>;
  logout(sessionId: string): Promise<void>;
  getUser(sessionId: string): Promise<User>;
  isAuthenticated(sessionId: string): Promise<boolean>;
  refreshSession(sessionId: string): Promise<Session>;
}

export class ClerkAuthProvider implements AuthProvider {
  private config: AuthConfig;
  private sessions: Map<string, Session> = new Map();
  private users: Map<string, User> = new Map();

  constructor(config: AuthConfig) {
    this.config = config;
  }

  async login(credentials?: Record<string, string>): Promise<Session> {
    log.info('Clerk login initiated');
    if (!credentials?.token && !this.config.clerkApiKey) {
      throw new AppError('CLERK_CONFIG_ERROR', 'Clerk API key or token required');
    }
    const userId = `clerk_${Date.now()}`;
    const session: Session = {
      id: `sess_${Date.now()}`,
      userId,
      accessToken: credentials?.token || `mock_clerk_token_${Date.now()}`,
      refreshToken: `refresh_${Date.now()}`,
      expiresAt: Date.now() + 3600_000,
      createdAt: Date.now(),
    };
    const user: User = {
      id: userId,
      email: `user${Date.now()}@example.com`,
      name: 'Clerk User',
      roles: ['developer'],
    };
    this.sessions.set(session.id, session);
    this.users.set(userId, user);
    log.info('Clerk login successful', { userId });
    return session;
  }

  async logout(sessionId: string): Promise<void> {
    this.sessions.delete(sessionId);
    log.info('Clerk logout', { sessionId });
  }

  async getUser(sessionId: string): Promise<User> {
    const session = this.sessions.get(sessionId);
    if (!session) throw new AppError('SESSION_NOT_FOUND', 'Session not found');
    const user = this.users.get(session.userId);
    if (!user) throw new AppError('USER_NOT_FOUND', 'User not found');
    return user;
  }

  async isAuthenticated(sessionId: string): Promise<boolean> {
    const session = this.sessions.get(sessionId);
    if (!session) return false;
    if (Date.now() > session.expiresAt) {
      this.sessions.delete(sessionId);
      return false;
    }
    return true;
  }

  async refreshSession(sessionId: string): Promise<Session> {
    const session = this.sessions.get(sessionId);
    if (!session) throw new AppError('SESSION_NOT_FOUND', 'Session not found');
    const newSession: Session = {
      ...session,
      id: `sess_${Date.now()}`,
      accessToken: `refreshed_clerk_token_${Date.now()}`,
      expiresAt: Date.now() + 3600_000,
    };
    this.sessions.set(newSession.id, newSession);
    this.sessions.delete(sessionId);
    return newSession;
  }
}

export class OAuth2AuthProvider implements AuthProvider {
  private config: AuthConfig;
  private sessions: Map<string, Session> = new Map();
  private users: Map<string, User> = new Map();
  private authCode: string | null = null;

  constructor(config: AuthConfig) {
    this.config = config;
  }

  getAuthorizationUrl(): string {
    const params = new URLSearchParams({
      response_type: 'code',
      client_id: this.config.clientId || '',
      redirect_uri: this.config.redirectUri || 'http://localhost:3000/callback',
      scope: (this.config.scopes || ['openid', 'profile', 'email']).join(' '),
    });
    return `${this.config.issuerUrl || 'https://auth.example.com'}/authorize?${params}`;
  }

  setAuthorizationCode(code: string): void {
    this.authCode = code;
  }

  async login(credentials?: Record<string, string>): Promise<Session> {
    log.info('OAuth2 login initiated');
    const code = credentials?.code || this.authCode || 'mock_auth_code';
    this.authCode = code;

    const userId = `oauth2_${Date.now()}`;
    const session: Session = {
      id: `sess_${Date.now()}`,
      userId,
      accessToken: `oauth2_token_${Date.now()}`,
      refreshToken: `oauth2_refresh_${Date.now()}`,
      expiresAt: Date.now() + 3600_000,
      createdAt: Date.now(),
    };
    const user: User = {
      id: userId,
      email: credentials?.email || `oauth2_user${Date.now()}@example.com`,
      name: credentials?.name || 'OAuth2 User',
      roles: (credentials?.roles || 'developer').split(','),
    };
    this.sessions.set(session.id, session);
    this.users.set(userId, user);
    log.info('OAuth2 login successful', { userId });
    return session;
  }

  async logout(sessionId: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (session?.refreshToken) {
      log.info('Revoking OAuth2 refresh token');
    }
    this.sessions.delete(sessionId);
    log.info('OAuth2 logout', { sessionId });
  }

  async getUser(sessionId: string): Promise<User> {
    const session = this.sessions.get(sessionId);
    if (!session) throw new AppError('SESSION_NOT_FOUND', 'Session not found');
    const user = this.users.get(session.userId);
    if (!user) throw new AppError('USER_NOT_FOUND', 'User not found');
    return user;
  }

  async isAuthenticated(sessionId: string): Promise<boolean> {
    const session = this.sessions.get(sessionId);
    if (!session) return false;
    if (Date.now() > session.expiresAt) {
      this.sessions.delete(sessionId);
      return false;
    }
    return true;
  }

  async refreshSession(sessionId: string): Promise<Session> {
    const session = this.sessions.get(sessionId);
    if (!session) throw new AppError('SESSION_NOT_FOUND', 'Session not found');
    if (!session.refreshToken) throw new AppError('NO_REFRESH_TOKEN', 'No refresh token available');

    const newSession: Session = {
      ...session,
      id: `sess_${Date.now()}`,
      accessToken: `refreshed_oauth2_token_${Date.now()}`,
      expiresAt: Date.now() + 3600_000,
    };
    this.sessions.set(newSession.id, newSession);
    this.sessions.delete(sessionId);
    return newSession;
  }
}

export function createAuthProvider(config: AuthConfig): AuthProvider {
  switch (config.provider) {
    case 'clerk':
      return new ClerkAuthProvider(config);
    case 'oauth2':
      return new OAuth2AuthProvider(config);
    case 'none':
      return new (class implements AuthProvider {
        async login(): Promise<Session> {
          return {
            id: 'anon_session',
            userId: 'anonymous',
            accessToken: 'anon_token',
            expiresAt: Infinity,
            createdAt: Date.now(),
          };
        }
        async logout(): Promise<void> {}
        async getUser(): Promise<User> {
          return {
            id: 'anonymous',
            email: 'anon@localhost',
            name: 'Anonymous',
            roles: ['viewer'],
          };
        }
        async isAuthenticated(): Promise<boolean> {
          return true;
        }
        async refreshSession(_sessionId: string): Promise<Session> {
          return { id: `anon_${Date.now()}`, userId: 'anonymous', accessToken: 'anon_token', expiresAt: Infinity, createdAt: Date.now() };
        }
      })();
    default:
      throw new AppError('UNKNOWN_AUTH_PROVIDER', `Unknown auth provider: ${config.provider}`);
  }
}
