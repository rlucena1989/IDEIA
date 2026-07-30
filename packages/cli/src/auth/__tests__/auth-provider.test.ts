import { AppError } from '@ideia/contracts';

jest.mock('@ideia/logger', () => ({
  createLogger: jest.fn(() => ({
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  })),
}));

jest.mock('@ideia/contracts', () => ({
  AppError: class AppError extends Error {
    constructor(public code: string, message: string) {
      super(message);
      this.name = 'AppError';
    }
  },
}));

import {
  createAuthProvider,
  ClerkAuthProvider,
  OAuth2AuthProvider,
  AuthProviderType,
  User,
  Session,
  AuthConfig,
} from '../auth-provider';

describe('AuthProviderType', () => {
  it('supports clerk', () => {
    const t: AuthProviderType = 'clerk';
    expect(t).toBe('clerk');
  });

  it('supports oauth2', () => {
    const t: AuthProviderType = 'oauth2';
    expect(t).toBe('oauth2');
  });

  it('supports none', () => {
    const t: AuthProviderType = 'none';
    expect(t).toBe('none');
  });
});

describe('User interface structure', () => {
  it('can be assigned a valid user object', () => {
    const user: User = {
      id: 'u1', email: 'a@b.com', name: 'Alice', roles: ['admin'],
    };
    expect(user.id).toBe('u1');
    expect(user.roles).toContain('admin');
  });

  it('allows optional avatarUrl and metadata', () => {
    const user: User = {
      id: 'u2', email: 'b@c.com', name: 'Bob', roles: [],
      avatarUrl: 'https://example.com/avatar.png',
      metadata: { department: 'eng' },
    };
    expect(user.avatarUrl).toBeDefined();
    expect(user.metadata?.department).toBe('eng');
  });
});

describe('Session interface structure', () => {
  it('can be assigned a valid session object', () => {
    const session: Session = {
      id: 's1', userId: 'u1', accessToken: 'tok', expiresAt: 1000, createdAt: 500,
    };
    expect(session.id).toBe('s1');
  });

  it('allows optional refreshToken', () => {
    const session: Session = {
      id: 's2', userId: 'u1', accessToken: 'tok', refreshToken: 'rtok',
      expiresAt: 1000, createdAt: 500,
    };
    expect(session.refreshToken).toBe('rtok');
  });
});

describe('AuthConfig interface structure', () => {
  it('can be assigned with clerk config', () => {
    const cfg: AuthConfig = { provider: 'clerk', clerkApiKey: 'sk_test_key' };
    expect(cfg.provider).toBe('clerk');
  });

  it('can be assigned with oauth2 config', () => {
    const cfg: AuthConfig = {
      provider: 'oauth2', clientId: 'cid', clientSecret: 'cs',
      issuerUrl: 'https://auth.example.com', redirectUri: 'https://app/callback',
      scopes: ['openid', 'profile'],
    };
    expect(cfg.scopes).toContain('openid');
  });
});

describe('createAuthProvider', () => {
  it('returns ClerkAuthProvider for clerk type', () => {
    const provider = createAuthProvider({ provider: 'clerk', clerkApiKey: 'sk_test_key' });
    expect(provider).toBeInstanceOf(ClerkAuthProvider);
  });

  it('returns OAuth2AuthProvider for oauth2 type', () => {
    const provider = createAuthProvider({ provider: 'oauth2', clientId: 'cid', issuerUrl: 'https://auth.example.com' });
    expect(provider).toBeInstanceOf(OAuth2AuthProvider);
  });

  it('returns an anonymous provider for none type', () => {
    const provider = createAuthProvider({ provider: 'none' });
    expect(provider).toBeDefined();
    expect(typeof provider.login).toBe('function');
    expect(typeof provider.logout).toBe('function');
    expect(typeof provider.getUser).toBe('function');
    expect(typeof provider.isAuthenticated).toBe('function');
    expect(typeof provider.refreshSession).toBe('function');
  });

  it('throws AppError for unknown provider type', () => {
    expect(() => createAuthProvider({ provider: 'unknown' as AuthProviderType })).toThrow(AppError);
  });

  it('anonymous provider login returns anon session', async () => {
    const provider = createAuthProvider({ provider: 'none' });
    const session = await provider.login();
    expect(session.id).toBe('anon_session');
    expect(session.userId).toBe('anonymous');
  });

  it('anonymous provider isAuthenticated returns true', async () => {
    const provider = createAuthProvider({ provider: 'none' });
    await expect(provider.isAuthenticated('any')).resolves.toBe(true);
  });
});

describe('ClerkAuthProvider', () => {
  let provider: ClerkAuthProvider;
  const config: AuthConfig = { provider: 'clerk', clerkApiKey: 'sk_test_key' };

  beforeEach(() => {
    provider = new ClerkAuthProvider(config);
  });

  it('implements AuthProvider interface', () => {
    expect(typeof provider.login).toBe('function');
    expect(typeof provider.logout).toBe('function');
    expect(typeof provider.getUser).toBe('function');
    expect(typeof provider.isAuthenticated).toBe('function');
    expect(typeof provider.refreshSession).toBe('function');
  });

  describe('login', () => {
    it('returns a session with token from credentials', async () => {
      const session = await provider.login({ token: 'my_custom_token' });
      expect(session.accessToken).toBe('my_custom_token');
      expect(session.userId).toMatch(/^clerk_/);
      expect(session.expiresAt).toBeGreaterThan(Date.now());
    });

    it('creates a mock token when no credentials provided', async () => {
      const session = await provider.login();
      expect(session.accessToken).toMatch(/^mock_clerk_token_/);
    });

    it('throws if no clerkApiKey and no token', async () => {
      const p = new ClerkAuthProvider({ provider: 'clerk' });
      await expect(p.login()).rejects.toThrow(AppError);
    });
  });

  describe('logout', () => {
    it('removes session without throwing', async () => {
      const session = await provider.login();
      await expect(provider.logout(session.id)).resolves.toBeUndefined();
    });

    it('does not throw for unknown session', async () => {
      await expect(provider.logout('nonexistent')).resolves.toBeUndefined();
    });
  });

  describe('getUser', () => {
    it('returns user for valid session', async () => {
      const session = await provider.login();
      const user = await provider.getUser(session.id);
      expect(user.id).toBe(session.userId);
      expect(user.email).toBeTruthy();
    });

    it('throws for invalid session', async () => {
      await expect(provider.getUser('invalid')).rejects.toThrow(AppError);
    });
  });

  describe('isAuthenticated', () => {
    it('returns true for active session', async () => {
      const session = await provider.login();
      await expect(provider.isAuthenticated(session.id)).resolves.toBe(true);
    });

    it('returns false for invalid session', async () => {
      await expect(provider.isAuthenticated('invalid')).resolves.toBe(false);
    });

    it('returns false for expired session', async () => {
      const p = new ClerkAuthProvider({ provider: 'clerk', clerkApiKey: 'sk_test_key' });
      const session = await p.login();
      jest.spyOn(Date, 'now').mockReturnValueOnce(session.expiresAt + 1);
      await expect(p.isAuthenticated(session.id)).resolves.toBe(false);
    });
  });

  describe('refreshSession', () => {
    it('returns a new session with refreshed token', async () => {
      const session = await provider.login();
      await new Promise(r => setImmediate(r));
      const refreshed = await provider.refreshSession(session.id);
      expect(refreshed.accessToken).toMatch(/^refreshed_clerk_token_/);
      expect(refreshed.expiresAt).toBeGreaterThanOrEqual(session.expiresAt);
      expect(refreshed.userId).toBe(session.userId);
    });

    it('throws for invalid session', async () => {
      await expect(provider.refreshSession('invalid')).rejects.toThrow(AppError);
    });
  });
});

describe('OAuth2AuthProvider', () => {
  let provider: OAuth2AuthProvider;
  const config: AuthConfig = {
    provider: 'oauth2',
    clientId: 'my_client',
    clientSecret: 'secret',
    issuerUrl: 'https://auth.myapp.com',
    redirectUri: 'https://myapp.com/callback',
    scopes: ['openid', 'email'],
  };

  beforeEach(() => {
    provider = new OAuth2AuthProvider(config);
  });

  it('implements AuthProvider interface', () => {
    expect(typeof provider.login).toBe('function');
    expect(typeof provider.logout).toBe('function');
    expect(typeof provider.getUser).toBe('function');
    expect(typeof provider.isAuthenticated).toBe('function');
    expect(typeof provider.refreshSession).toBe('function');
  });

  describe('getAuthorizationUrl', () => {
    it('builds URL with config params', () => {
      const url = provider.getAuthorizationUrl();
      expect(url).toContain('https://auth.myapp.com/authorize');
      expect(url).toContain('client_id=my_client');
      expect(url).toContain('redirect_uri=https%3A%2F%2Fmyapp.com%2Fcallback');
      expect(url).toContain('scope=openid+email');
    });

    it('falls back to defaults when config is minimal', () => {
      const p = new OAuth2AuthProvider({ provider: 'oauth2' });
      const url = p.getAuthorizationUrl();
      expect(url).toContain('auth.example.com');
      expect(url).toContain('client_id=');
      expect(url).toContain('scope=openid+profile+email');
    });
  });

  describe('setAuthorizationCode', () => {
    it('stores the auth code', () => {
      provider.setAuthorizationCode('abc123');
      expect((provider as any).authCode).toBe('abc123');
    });
  });

  describe('login', () => {
    it('returns a session with oauth2 token from credentials', async () => {
      const session = await provider.login({ code: 'authcode123' });
      expect(session.accessToken).toMatch(/^oauth2_token_/);
      expect(session.userId).toMatch(/^oauth2_/);
    });

    it('uses stored auth code when no credentials given', async () => {
      provider.setAuthorizationCode('stored_code');
      const session = await provider.login();
      expect(session.accessToken).toMatch(/^oauth2_token_/);
    });

    it('sets user info from credentials', async () => {
      const session = await provider.login({
        code: 'c', email: 'custom@user.com', name: 'Custom User', roles: 'admin,dev',
      });
      const user = await provider.getUser(session.id);
      expect(user.email).toBe('custom@user.com');
      expect(user.name).toBe('Custom User');
      expect(user.roles).toEqual(['admin', 'dev']);
    });
  });

  describe('getUser', () => {
    it('returns user for valid session', async () => {
      const session = await provider.login();
      const user = await provider.getUser(session.id);
      expect(user).toBeDefined();
    });

    it('throws for invalid session', async () => {
      await expect(provider.getUser('invalid')).rejects.toThrow(AppError);
    });
  });

  describe('isAuthenticated', () => {
    it('returns true for active session', async () => {
      const session = await provider.login();
      await expect(provider.isAuthenticated(session.id)).resolves.toBe(true);
    });

    it('returns false for unknown session', async () => {
      await expect(provider.isAuthenticated('bad')).resolves.toBe(false);
    });
  });

  describe('refreshSession', () => {
    it('returns new session with refreshed token', async () => {
      const session = await provider.login();
      const refreshed = await provider.refreshSession(session.id);
      expect(refreshed.accessToken).toMatch(/^refreshed_oauth2_token_/);
    });

    it('throws if session has no refreshToken', async () => {
      provider = new OAuth2AuthProvider(config);
      const session: Session = {
        id: 'no_refresh', userId: 'u1', accessToken: 'tok',
        expiresAt: Infinity, createdAt: 0,
      };
      (provider as any).sessions.set('no_refresh', session);
      await expect(provider.refreshSession('no_refresh')).rejects.toThrow(AppError);
    });

    it('throws for invalid session', async () => {
      await expect(provider.refreshSession('invalid')).rejects.toThrow(AppError);
    });
  });

  describe('logout', () => {
    it('removes session', async () => {
      const session = await provider.login();
      await expect(provider.logout(session.id)).resolves.toBeUndefined();
      await expect(provider.isAuthenticated(session.id)).resolves.toBe(false);
    });
  });
});
