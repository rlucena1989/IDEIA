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

// crypto.getRandomValues is not available in Node.js test environment
let randomCallCount = 0;
const mockRandomValues = jest.fn((arr: Uint8Array) => {
  for (let i = 0; i < arr.length; i++) {
    arr[i] = (i + randomCallCount) % 256;
  }
  randomCallCount++;
});
Object.defineProperty(global, 'crypto', {
  value: { getRandomValues: mockRandomValues },
  writable: true,
});

import {
  WebAuthnManager,
  getWebAuthnManager,
  registerCredential,
  authenticateWithCredential,
  WebAuthnCredential,
  WebAuthnRegistrationOptions,
  WebAuthnAuthenticationOptions,
} from '../webauthn';

describe('WebAuthnCredential interface', () => {
  it('holds credential data', () => {
    const cred: WebAuthnCredential = {
      id: 'cred1',
      userId: 'user1',
      publicKey: 'pub_key',
      credentialId: 'cred_id_1',
      counter: 0,
      createdAt: 100,
      lastUsedAt: 100,
    };
    expect(cred.id).toBe('cred1');
  });

  it('allows optional fields', () => {
    const cred: WebAuthnCredential = {
      id: 'c1', userId: 'u1', publicKey: 'pk', credentialId: 'cid',
      counter: 1, createdAt: 0, lastUsedAt: 0,
      deviceName: 'USB Key',
      transports: ['usb', 'nfc'],
    };
    expect(cred.deviceName).toBe('USB Key');
    expect(cred.transports).toContain('usb');
  });
});

describe('WebAuthnRegistrationOptions interface', () => {
  it('holds registration options', () => {
    const opts: WebAuthnRegistrationOptions = {
      challenge: 'challenge',
      rp: { name: 'App', id: 'app.local' },
      user: { id: 'uid', name: 'user', displayName: 'User' },
      pubKeyCredParams: [{ type: 'public-key', alg: -7 }],
      timeout: 60000,
    };
    expect(opts.rp.name).toBe('App');
  });
});

describe('WebAuthnAuthenticationOptions interface', () => {
  it('holds auth options', () => {
    const opts: WebAuthnAuthenticationOptions = {
      challenge: 'challenge',
      timeout: 60000,
      rpId: 'app.local',
    };
    expect(opts.rpId).toBe('app.local');
  });
});

describe('WebAuthnManager', () => {
  let manager: WebAuthnManager;

  beforeEach(() => {
    manager = new WebAuthnManager();
  });

  describe('registerCredential', () => {
    it('returns registration result with credential and options', async () => {
      const result = await manager.registerCredential('user1', 'My Device');
      expect(result.credential).toBeDefined();
      expect(result.credential.userId).toBe('user1');
      expect(result.credential.deviceName).toBe('My Device');
      expect(result.credential.counter).toBe(0);
      expect(result.registrationOptions).toBeDefined();
      expect(result.registrationOptions.rp.name).toBe('AI-Devkit');
    });

    it('stores pending registration', async () => {
      await manager.registerCredential('user1');
      const pending = manager.getPendingRegistration('user1');
      expect(pending).toBeDefined();
    });

    it('generates credential with unique IDs', async () => {
      const r1 = await manager.registerCredential('user1');
      const r2 = await manager.registerCredential('user1');
      expect(r1.credential.id).not.toBe(r2.credential.id);
      expect(r1.credential.credentialId).not.toBe(r2.credential.credentialId);
    });

    it('excludes existing credentials', async () => {
      await manager.registerCredential('user1');
      const result = await manager.registerCredential('user1');
      const exclude = result.registrationOptions.excludeCredentials;
      expect(exclude!.length).toBe(1);
    });
  });

  describe('authenticateWithCredential', () => {
    it('returns authenticated result for registered user', async () => {
      await manager.registerCredential('user1');
      const result = await manager.authenticateWithCredential('user1');
      expect(result.authenticated).toBe(true);
      expect(result.userId).toBe('user1');
      expect(result.token).toMatch(/^webauthn_token_/);
    });

    it('increments credential counter on auth', async () => {
      const _ = await manager.registerCredential('user1');
      const r1 = await manager.authenticateWithCredential('user1');
      expect(r1.counter).toBe(1);
      const r2 = await manager.authenticateWithCredential('user1');
      expect(r2.counter).toBe(2);
    });

    it('authenticates with specific credentialId', async () => {
      const reg = await manager.registerCredential('user1');
      const result = await manager.authenticateWithCredential('user1', reg.credential.credentialId);
      expect(result.authenticated).toBe(true);
      expect(result.credentialId).toBe(reg.credential.credentialId);
    });

    it('throws for user with no credentials', async () => {
      await expect(manager.authenticateWithCredential('unknown')).rejects.toThrow(AppError);
    });

    it('throws for unknown credentialId', async () => {
      await manager.registerCredential('user1');
      await expect(manager.authenticateWithCredential('user1', 'bad_cred_id')).rejects.toThrow(AppError);
    });

    it('stores pending authentication options', async () => {
      await manager.registerCredential('user1');
      await manager.authenticateWithCredential('user1');
      const pending = manager.getPendingAuthentication('user1');
      expect(pending).toBeDefined();
      expect(pending!.rpId).toBe('ai-devkit.local');
    });
  });

  describe('getCredentials', () => {
    it('returns empty array for unknown user', async () => {
      const creds = await manager.getCredentials('unknown');
      expect(creds).toEqual([]);
    });

    it('returns registered credentials', async () => {
      await manager.registerCredential('user1');
      await manager.registerCredential('user1');
      const creds = await manager.getCredentials('user1');
      expect(creds.length).toBe(2);
    });
  });

  describe('removeCredential', () => {
    it('removes a specific credential', async () => {
      const reg = await manager.registerCredential('user1');
      await manager.removeCredential('user1', reg.credential.credentialId);
      const creds = await manager.getCredentials('user1');
      expect(creds.length).toBe(0);
    });

    it('throws for unknown credential', async () => {
      await manager.registerCredential('user1');
      await expect(manager.removeCredential('user1', 'bad_id')).rejects.toThrow(AppError);
    });

    it('throws for user with no credentials', async () => {
      await expect(manager.removeCredential('unknown', 'id')).rejects.toThrow(AppError);
    });
  });

  describe('getPendingRegistration', () => {
    it('returns undefined for user without pending', () => {
      expect(manager.getPendingRegistration('unknown')).toBeUndefined();
    });
  });

  describe('getPendingAuthentication', () => {
    it('returns undefined for user without pending', () => {
      expect(manager.getPendingAuthentication('unknown')).toBeUndefined();
    });
  });
});

describe('getWebAuthnManager', () => {
  it('returns a singleton WebAuthnManager', () => {
    const m1 = getWebAuthnManager();
    const m2 = getWebAuthnManager();
    expect(m1).toBe(m2);
  });
});

describe('module-level functions', () => {
  beforeAll(async () => {
    const creds = await getWebAuthnManager().getCredentials('func_user');
    for (const c of creds) {
      await getWebAuthnManager().removeCredential('func_user', c.credentialId);
    }
  });

  it('registerCredential delegates to WebAuthnManager', async () => {
    const result = await registerCredential('func_user', 'Test Device');
    expect(result).toBeDefined();
    expect(result.credential.userId).toBe('func_user');
  });

  it('authenticateWithCredential delegates to WebAuthnManager', async () => {
    const result = await authenticateWithCredential('func_user');
    expect(result.authenticated).toBe(true);
  });
});
