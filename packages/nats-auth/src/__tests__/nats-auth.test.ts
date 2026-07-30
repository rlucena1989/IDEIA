import { NKeyManager } from '../nkey-manager';
import { SecureKeyStorage } from '../secure-key-storage';
import { OperatorJWTGenerator } from '../operator-jwt';
import { AccountJWTGenerator } from '../account-jwt';
import { UserJWTGenerator } from '../user-jwt';
import { MultiTenantConfig } from '../multi-tenant-config';
import { CredentialRotator } from '../credential-rotator';
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';

describe('NKeyManager', () => {
  it('should generate operator key pair', () => {
    const mgr = new NKeyManager();
    const kp = mgr.generateKey('operator');
    expect(kp.publicKey).toBeTruthy();
    expect(kp.publicKey.startsWith('O')).toBe(true);
    expect(kp.seed.length).toBe(32);
  });

  it('should generate account key pair', () => {
    const mgr = new NKeyManager();
    const kp = mgr.generateKey('account');
    expect(kp.publicKey.startsWith('A')).toBe(true);
  });

  it('should generate user key pair', () => {
    const mgr = new NKeyManager();
    const kp = mgr.generateKey('user');
    expect(kp.publicKey.startsWith('U')).toBe(true);
  });

  it('should sign and verify data', () => {
    const mgr = new NKeyManager();
    const kp = mgr.generateKey('user');
    const data = new TextEncoder().encode('test-message');
    const sig = kp.sign(data);
    expect(kp.verify(data, sig)).toBe(true);
  });

  it('should reject tampered data', () => {
    const mgr = new NKeyManager();
    const kp = mgr.generateKey('user');
    const data = new TextEncoder().encode('test-message');
    const sig = kp.sign(data);
    const tampered = new TextEncoder().encode('tampered-message');
    expect(kp.verify(tampered, sig)).toBe(false);
  });
});

describe('SecureKeyStorage', () => {
  let tmpDir: string;
  let storage: SecureKeyStorage;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'nkey-'));
    storage = new SecureKeyStorage(tmpDir);
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('should store and load seed', async () => {
    const seed = new Uint8Array([1, 2, 3, 4, 5]);
    await storage.storeSeed('test-key', seed);
    const loaded = await storage.loadSeed('test-key');
    expect(loaded).toEqual(seed);
  });

  it('should return null for missing key', async () => {
    const loaded = await storage.loadSeed('nonexistent');
    expect(loaded).toBeNull();
  });

  it('should persist across instances', async () => {
    const seed = new Uint8Array([10, 20, 30]);
    await storage.storeSeed('persist-key', seed);
    const storage2 = new SecureKeyStorage(tmpDir);
    const loaded = await storage2.loadSeed('persist-key');
    expect(loaded).toBeDefined();
    expect(Buffer.from(loaded!).toString('hex')).toBe(Buffer.from(seed).toString('hex'));
  });

  it('should delete keys', async () => {
    const seed = new Uint8Array([1, 2, 3]);
    await storage.storeSeed('delete-key', seed);
    storage.deleteKey('delete-key');
    expect(storage.hasKey('delete-key')).toBe(false);
  });
});

describe('OperatorJWTGenerator', () => {
  it('should generate valid JWT format', async () => {
    const mgr = new NKeyManager();
    const kp = mgr.generateKey('operator');
    const gen = new OperatorJWTGenerator();
    const jwt = await gen.generate(kp, {
      type: 'operator',
      name: 'IDEIA_OPERATOR',
      nkey: kp.publicKey,
      signingKeys: [],
      accountServerUrl: 'nats://localhost:4222',
      operatorServiceUrls: [],
      maxTokenTTL: 86400,
      issuedAt: Date.now(),
      expiresAt: Date.now() + 86400000,
    });
    const parts = jwt.split('.');
    expect(parts.length).toBe(3);
    const header = JSON.parse(Buffer.from(parts[0], 'base64url').toString());
    expect(header.typ).toBe('jwt');
    expect(header.alg).toBe('ed25519-nkey');
    const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString());
    expect(payload.name).toBe('IDEIA_OPERATOR');
    expect(payload.type).toBe('operator');
  });
});

describe('AccountJWTGenerator', () => {
  it('should generate account JWT', async () => {
    const mgr = new NKeyManager();
    const sk = mgr.generateKey('account');
    const ak = mgr.generateKey('account');
    const gen = new AccountJWTGenerator();
    const jwt = await gen.generate(sk, ak, {
      type: 'account',
      name: 'IDEIA_CORE',
      nkey: ak.publicKey,
      signingKeys: [{ key: sk.publicKey, kind: 'user' }],
      limits: { subs: 1000, data: -1, payload: -1, imports: 10, exports: 10 },
      exports: [],
      imports: [],
      revocations: {},
      issuedAt: Date.now(),
      expiresAt: Date.now() + 86400000,
    });
    expect(jwt.split('.').length).toBe(3);
  });

  it('should include export definitions', async () => {
    const mgr = new NKeyManager();
    const sk = mgr.generateKey('account');
    const ak = mgr.generateKey('account');
    const gen = new AccountJWTGenerator();
    const jwt = await gen.generate(sk, ak, {
      type: 'account',
      name: 'IDEIA_WITH_EXPORTS',
      nkey: ak.publicKey,
      signingKeys: [],
      limits: { subs: 500, data: -1, payload: -1, imports: 5, exports: 5 },
      exports: [{ name: 'agent-events', subject: 'agent.>', type: 'stream', tokenReq: false, approvedAccounts: ['IDEIA_AGENTS'] }],
      imports: [],
      revocations: {},
      issuedAt: Date.now(),
      expiresAt: Date.now() + 86400000,
    });
    expect(jwt).toBeTruthy();
  });
});

describe('UserJWTGenerator', () => {
  it('should generate user JWT with permissions', async () => {
    const mgr = new NKeyManager();
    const sk = mgr.generateKey('account');
    const uk = mgr.generateKey('user');
    const gen = new UserJWTGenerator();
    const jwt = await gen.generate(sk, uk, 'ACCOUNT_PUB_KEY', {
      type: 'user',
      name: 'event-bus',
      nkey: uk.publicKey,
      account: 'ACCOUNT_PUB_KEY',
      pub: { allow: ['system.>'], deny: [] },
      sub: { allow: ['system.>'], deny: [] },
      tags: ['production'],
      issuedAt: Date.now(),
      expiresAt: Date.now() + 86400000,
    });
    expect(jwt.split('.').length).toBe(3);
  });
});

describe('MultiTenantConfig', () => {
  it('should generate valid NATS config', () => {
    const config = new MultiTenantConfig();
    const result = config.generateNatsConfig({
      operatorName: 'IDEIA_OPERATOR',
      operatorNkey: 'O12345',
      accountServerUrl: 'nats://localhost:4222',
      accounts: [
        {
          name: 'IDEIA_CORE',
          nkey: 'A_CORE',
          limits: { subs: 1000, data: -1, payload: -1, imports: 10, exports: 10 },
          exports: [{ stream: 'agent.events', accounts: ['IDEIA_AGENTS'] }],
          imports: [],
          users: [{ name: 'event-bus', pubAllow: ['system.>'], pubDeny: [], subAllow: ['system.>'], subDeny: [] }],
        },
      ],
    });
    expect(result).toContain('IDEIA_OPERATOR');
    expect(result).toContain('IDEIA_CORE');
    expect(result).toContain('event-bus');
    expect(result).toContain('system.>');
  });

  it('should handle multiple accounts', () => {
    const config = new MultiTenantConfig();
    const result = config.generateNatsConfig({
      operatorName: 'IDEIA_OPERATOR',
      operatorNkey: 'O123',
      accountServerUrl: 'nats://localhost',
      accounts: [
        { name: 'IDEIA_CORE', nkey: 'A1', limits: { subs: 1000, data: -1, payload: -1, imports: 10, exports: 10 }, exports: [], imports: [], users: [] },
        { name: 'IDEIA_AGENTS', nkey: 'A2', limits: { subs: 500, data: -1, payload: -1, imports: 5, exports: 5 }, exports: [], imports: [{ stream: { account: 'IDEIA_CORE', subject: 'agent.events' } }], users: [] },
      ],
    });
    expect(result).toContain('IDEIA_CORE');
    expect(result).toContain('IDEIA_AGENTS');
  });
});

describe('CredentialRotator', () => {
  it('should rotate key and record history', async () => {
    const rotator = new CredentialRotator();
    const oldSeed = new Uint8Array([1, 2, 3]);
    const result = await rotator.rotateKey(
      oldSeed,
      async () => new Uint8Array([4, 5, 6]),
      async () => {},
    );
    expect(result.newSeed).toEqual(new Uint8Array([4, 5, 6]));
    expect(rotator.getRotationCount()).toBe(1);
  });

  it('should track rotation history', async () => {
    const rotator = new CredentialRotator();
    await rotator.rotateKey(
      new Uint8Array([1]),
      async () => new Uint8Array([2]),
      async () => {},
    );
    await rotator.rotateKey(
      new Uint8Array([2]),
      async () => new Uint8Array([3]),
      async () => {},
    );
    expect(rotator.getRotationCount()).toBe(2);
    expect(rotator.getRotationHistory().length).toBe(2);
  });
});
