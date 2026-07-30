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
  SessionManager,
  getSessionManager,
  createSession,
  refreshSession,
  validateSession,
  revokeSession,
  Session,
  SessionConfig,
} from '../session';

describe('SessionConfig interface', () => {
  it('has defaultable properties', () => {
    const cfg: SessionConfig = {
      sessionTTLMs: 3600000,
      refreshTTLMs: 86400000,
      maxSessionsPerUser: 10,
      extendOnActivity: false,
    };
    expect(cfg.sessionTTLMs).toBe(3600000);
    expect(cfg.extendOnActivity).toBe(false);
  });
});

describe('Session interface', () => {
  it('holds session data', () => {
    const s: Session = {
      id: 'sess_abc', userId: 'u1', createdAt: 100, expiresAt: 200,
      refreshToken: 'ref_xyz', lastActivityAt: 100,
    };
    expect(s.id).toBe('sess_abc');
  });
});

describe('SessionManager', () => {
  let manager: SessionManager;

  beforeEach(() => {
    manager = new SessionManager();
  });

  describe('createSession', () => {
    it('creates a session with generated id and refresh token', async () => {
      const session = await manager.createSession('user1');
      expect(session.userId).toBe('user1');
      expect(session.id).toMatch(/^sess_/);
      expect(session.refreshToken).toMatch(/^ref_/);
      expect(session.expiresAt).toBeGreaterThan(session.createdAt);
    });

    it('attaches metadata when provided', async () => {
      const session = await manager.createSession('user1', { ip: '10.0.0.1', origin: 'cli' });
      expect(session.metadata?.ip).toBe('10.0.0.1');
      expect(session.metadata?.origin).toBe('cli');
    });

    it('revokes oldest session when max sessions exceeded', async () => {
      const cfg = { maxSessionsPerUser: 2 };
      manager = new SessionManager(cfg);
      const s1 = await manager.createSession('user1');
      const _s2 = await manager.createSession('user1');
      expect((await manager.getUserSessions('user1')).length).toBe(2);
      const _s3 = await manager.createSession('user1');
      const sessions = await manager.getUserSessions('user1');
      expect(sessions.length).toBe(2);
      expect(sessions.find(s => s.id === s1.id)).toBeUndefined();
    });
  });

  describe('validateSession', () => {
    it('returns session for valid id', async () => {
      const session = await manager.createSession('user1');
      const validated = await manager.validateSession(session.id);
      expect(validated.id).toBe(session.id);
    });

    it('throws for unknown session', async () => {
      await expect(manager.validateSession('unknown')).rejects.toThrow(AppError);
    });

    it('throws and revokes expired session', async () => {
      const session = await manager.createSession('user1');
      jest.spyOn(Date, 'now').mockReturnValueOnce(session.expiresAt + 1);
      await expect(manager.validateSession(session.id)).rejects.toThrow(AppError);
      await expect(manager.validateSession(session.id)).rejects.toThrow(AppError);
    });

    it('updates lastActivityAt when extendOnActivity is true', async () => {
      const session = await manager.createSession('user1');
      const before = session.lastActivityAt;
      await manager.validateSession(session.id);
      const validated = await manager.validateSession(session.id);
      expect(validated.lastActivityAt).toBeGreaterThanOrEqual(before);
    });
  });

  describe('refreshSession', () => {
    it('creates a new session and removes old one', async () => {
      const session = await manager.createSession('user1');
      const refreshed = await manager.refreshSession(session.id);
      expect(refreshed.id).not.toBe(session.id);
      expect(refreshed.userId).toBe('user1');
      await expect(manager.validateSession(session.id)).rejects.toThrow(AppError);
    });

    it('throws for unknown session', async () => {
      await expect(manager.refreshSession('unknown')).rejects.toThrow(AppError);
    });

    it('throws when refresh window expired', async () => {
      const session = await manager.createSession('user1');
      jest.spyOn(Date, 'now').mockReturnValueOnce(session.expiresAt + 7 * 24 * 3600 * 1000 + 1);
      await expect(manager.refreshSession(session.id)).rejects.toThrow(AppError);
    });
  });

  describe('revokeSession', () => {
    it('revokes a single session', async () => {
      const session = await manager.createSession('user1');
      await manager.revokeSession(session.id);
      const sessions = await manager.getUserSessions('user1');
      expect(sessions.length).toBe(0);
    });
  });

  describe('revokeAllUserSessions', () => {
    it('revokes all sessions for a user', async () => {
      await manager.createSession('user1');
      await manager.createSession('user1');
      const count = await manager.revokeAllUserSessions('user1');
      expect(count).toBe(2);
      const sessions = await manager.getUserSessions('user1');
      expect(sessions.length).toBe(0);
    });

    it('returns 0 for unknown user', async () => {
      const count = await manager.revokeAllUserSessions('unknown');
      expect(count).toBe(0);
    });
  });

  describe('getUserSessions', () => {
    it('returns active sessions for a user', async () => {
      await manager.createSession('user1');
      await manager.createSession('user1');
      const sessions = await manager.getUserSessions('user1');
      expect(sessions.length).toBe(2);
    });

    it('returns empty array for unknown user', async () => {
      const sessions = await manager.getUserSessions('unknown');
      expect(sessions).toEqual([]);
    });

    it('filters out expired sessions', async () => {
      const session = await manager.createSession('user1');
      jest.spyOn(Date, 'now').mockReturnValueOnce(session.expiresAt + 1);
      const sessions = await manager.getUserSessions('user1');
      expect(sessions.length).toBe(0);
    });
  });

  describe('updateConfig', () => {
    it('updates configuration', () => {
      manager.updateConfig({ maxSessionsPerUser: 20 });
      expect(manager.getConfig().maxSessionsPerUser).toBe(20);
    });
  });

  describe('getConfig', () => {
    it('returns a copy of config with defaults', () => {
      const cfg = manager.getConfig();
      expect(cfg.sessionTTLMs).toBe(24 * 60 * 60 * 1000);
      expect(cfg.refreshTTLMs).toBe(7 * 24 * 60 * 60 * 1000);
      expect(cfg.maxSessionsPerUser).toBe(5);
      expect(cfg.extendOnActivity).toBe(true);
    });
  });

  describe('getActiveSessionCount', () => {
    it('returns count of active sessions', async () => {
      await manager.createSession('user1');
      await manager.createSession('user2');
      expect(manager.getActiveSessionCount()).toBe(2);
    });
  });

  describe('constructor with partial config', () => {
    it('merges with defaults', () => {
      const m = new SessionManager({ maxSessionsPerUser: 1 });
      expect(m.getConfig().maxSessionsPerUser).toBe(1);
      expect(m.getConfig().sessionTTLMs).toBe(24 * 60 * 60 * 1000);
    });
  });
});

describe('getSessionManager', () => {
  afterEach(() => {
    (getSessionManager as any)();
    const m = getSessionManager();
    m.revokeAllUserSessions('any');
  });

  it('returns a singleton SessionManager', () => {
    const m1 = getSessionManager();
    const m2 = getSessionManager();
    expect(m1).toBe(m2);
  });
});

describe('module-level functions', () => {
  afterEach(async () => {
    const sessions = await getSessionManager().getUserSessions('func_user');
    for (const s of sessions) {
      await revokeSession(s.id);
    }
  });

  it('createSession delegates to SessionManager', async () => {
    const session = await createSession('func_user');
    expect(session.userId).toBe('func_user');
  });

  it('validateSession delegates to SessionManager', async () => {
    const session = await createSession('func_user');
    const validated = await validateSession(session.id);
    expect(validated.id).toBe(session.id);
  });

  it('refreshSession delegates to SessionManager', async () => {
    const session = await createSession('func_user');
    const refreshed = await refreshSession(session.id);
    expect(refreshed.id).not.toBe(session.id);
  });

  it('revokeSession delegates to SessionManager', async () => {
    const session = await createSession('func_user');
    await revokeSession(session.id);
    await expect(validateSession(session.id)).rejects.toThrow(AppError);
  });
});
