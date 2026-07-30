import { NKEYManager } from '../nkey-manager';
import { JWTIssuer } from '../jwt-issuer';
import { ACLManager } from '../acl-manager';
import { mTLSManager } from '../mtls-manager';
import { AuthCalloutHandler, type AuthCalloutHandlerConfig } from '../auth-callout-handler';
import { type AuthCalloutUser, type UserDatabase } from '../auth-callout-handler';
import { MultiTenantIsolator } from '../multi-tenant-isolator';
import { ThreatModelAnalyzer } from '../threat-model-analyzer';
import { NATSAuthManager } from '../nats-auth-manager';
import { createLogger } from '@ideia/logger';
import type { Logger } from '@ideia/logger';

// ─── NKEYManager ───────────────────────────────────────────────────────────

describe('NKEYManager', () => {
  let mgr: NKEYManager;

  beforeEach(() => {
    mgr = new NKEYManager();
  });

  it('should generate operator key with O prefix', () => {
    const kp = mgr.generateKey('operator');
    expect(kp.publicKey).toBeTruthy();
    expect(kp.publicKey.startsWith('O')).toBe(true);
    expect(kp.seed.length).toBe(32);
  });

  it('should generate account key with A prefix', () => {
    const kp = mgr.generateKey('account');
    expect(kp.publicKey.startsWith('A')).toBe(true);
  });

  it('should generate user key with U prefix', () => {
    const kp = mgr.generateKey('user');
    expect(kp.publicKey.startsWith('U')).toBe(true);
  });

  it('should sign and verify data correctly', () => {
    const kp = mgr.generateKey('user');
    const data = new TextEncoder().encode('test-message');
    const sig = kp.sign(data);
    expect(kp.verify(data, sig)).toBe(true);
  });

  it('should reject tampered data', () => {
    const kp = mgr.generateKey('user');
    const data = new TextEncoder().encode('test-message');
    const sig = kp.sign(data);
    const tampered = new TextEncoder().encode('tampered');
    expect(kp.verify(tampered, sig)).toBe(false);
  });

  it('should reject invalid signature length', () => {
    const kp = mgr.generateKey('user');
    const data = new TextEncoder().encode('test');
    const invalidSig = new Uint8Array(32);
    expect(kp.verify(data, invalidSig)).toBe(false);
  });

  it('should restore key from seed', () => {
    const original = mgr.generateKey('user');
    const restored = mgr.fromSeed(original.seed, 'user');
    expect(restored.publicKey).toBe(original.publicKey);
    const data = new TextEncoder().encode('test');
    const sig = restored.sign(data);
    expect(original.verify(data, sig)).toBe(true);
  });

  it('should produce deterministic signatures from same seed', () => {
    const seed = new Uint8Array(32).fill(42);
    const kp1 = mgr.fromSeed(seed, 'user');
    const kp2 = mgr.fromSeed(seed, 'user');
    expect(kp1.publicKey).toBe(kp2.publicKey);
  });

  it('should sign and verify via manager methods', () => {
    const kp = mgr.generateKey('account');
    const data = new TextEncoder().encode('manager-test');
    const sig = mgr.sign(kp, data);
    expect(mgr.verify(kp, data, sig)).toBe(true);
  });

  it('should return seed via getSeed', () => {
    const kp = mgr.generateKey('operator');
    const seed = mgr.getSeed(kp);
    expect(seed).toEqual(kp.seed);
  });

  it('should return public key via getPublicKey', () => {
    const kp = mgr.generateKey('account');
    expect(mgr.getPublicKey(kp)).toBe(kp.publicKey);
  });
});

// ─── JWTIssuer ─────────────────────────────────────────────────────────────

describe('JWTIssuer', () => {
  let issuer: JWTIssuer;
  let nkeyMgr: NKEYManager;

  beforeEach(() => {
    issuer = new JWTIssuer();
    nkeyMgr = new NKEYManager();
  });

  it('should issue operator JWT with correct format', () => {
    const opKey = nkeyMgr.generateKey('operator');
    const jwt = issuer.issueOperatorJWT(opKey, {
      name: 'IDEIA_OPERATOR',
      signingKeys: [opKey.publicKey],
      accountServerUrl: 'nats://localhost:4222',
    });
    const parts = jwt.split('.');
    expect(parts.length).toBe(3);
    const header = JSON.parse(Buffer.from(parts[0], 'base64url').toString());
    expect(header.typ).toBe('jwt');
    expect(header.alg).toBe('ed25519-nkey');
  });

  it('should issue operator JWT with correct payload', () => {
    const opKey = nkeyMgr.generateKey('operator');
    const jwt = issuer.issueOperatorJWT(opKey, {
      name: 'IDEIA_OPERATOR',
      signingKeys: [],
      accountServerUrl: 'nats://localhost:4222',
    });
    const parsed = issuer.parseOperatorJWT(jwt);
    expect(parsed.valid).toBe(true);
    expect(parsed.payload.name).toBe('IDEIA_OPERATOR');
    expect(parsed.payload.type).toBe('operator');
    expect(parsed.payload.nkey).toBe(opKey.publicKey);
  });

  it('should issue account JWT', () => {
    const opKey = nkeyMgr.generateKey('operator');
    const accKey = nkeyMgr.generateKey('account');
    const jwt = issuer.issueAccountJWT(opKey, accKey, {
      name: 'IDEIA_CORE',
    });
    const parsed = issuer.parseAccountJWT(jwt);
    expect(parsed.valid).toBe(true);
    expect(parsed.payload.name).toBe('IDEIA_CORE');
    expect(parsed.payload.type).toBe('account');
  });

  it('should issue user JWT with permissions', () => {
    const sk = nkeyMgr.generateKey('account');
    const uk = nkeyMgr.generateKey('user');
    const jwt = issuer.issueUserJWT(sk, uk, 'ACCOUNT_PUB_KEY', {
      name: 'event-bus',
      pub: { allow: ['system.>'], deny: [] },
      sub: { allow: ['system.>'], deny: [] },
      tags: ['core'],
    });
    const parsed = issuer.parseUserJWT(jwt);
    expect(parsed.valid).toBe(true);
    expect(parsed.payload.name).toBe('event-bus');
    expect(parsed.payload.pub.allow).toEqual(['system.>']);
    expect(parsed.payload.allow_sub).toEqual(['system.>']);
    expect(parsed.payload.tags).toEqual(['core']);
  });

  it('should detect expired JWT', () => {
    const sk = nkeyMgr.generateKey('account');
    const uk = nkeyMgr.generateKey('user');
    const jwt = issuer.issueUserJWT(sk, uk, 'ACC', {
      name: 'expired-user',
      issuedAt: Date.now() - 100000,
      expiresAt: Date.now() - 1,
    });
    expect(issuer.isExpired(jwt)).toBe(true);
  });

  it('should detect non-expired JWT', () => {
    const sk = nkeyMgr.generateKey('account');
    const uk = nkeyMgr.generateKey('user');
    const jwt = issuer.issueUserJWT(sk, uk, 'ACC', {
      name: 'valid-user',
      issuedAt: Date.now(),
      expiresAt: Date.now() + 86400000,
    });
    expect(issuer.isExpired(jwt)).toBe(false);
  });

  it('should return expiry from JWT', () => {
    const sk = nkeyMgr.generateKey('account');
    const uk = nkeyMgr.generateKey('user');
    const future = Date.now() + 86400000;
    const jwt = issuer.issueUserJWT(sk, uk, 'ACC', {
      name: 'test',
      expiresAt: future,
    });
    const expiry = issuer.getExpiry(jwt);
    expect(expiry).not.toBeNull();
    expect(expiry).toBeGreaterThan(future - 2000);
    expect(expiry).toBeLessThan(future + 2000);
  });

  it('should return null expiry for invalid JWT', () => {
    expect(issuer.getExpiry('invalid.jwt')).toBeNull();
  });

  it('should detect invalid JWT format', () => {
    const result = issuer.parseUserJWT('invalid');
    expect(result.valid).toBe(false);
  });

  it('should detect wrong JWT type', () => {
    const opKey = nkeyMgr.generateKey('operator');
    const jwt = issuer.issueOperatorJWT(opKey, {
      name: 'OP',
      signingKeys: [],
      accountServerUrl: 'nats://localhost',
    });
    const result = issuer.parseUserJWT(jwt);
    expect(result.valid).toBe(false);
  });

  it('should verify JWT signature', () => {
    const sk = nkeyMgr.generateKey('account');
    const uk = nkeyMgr.generateKey('user');
    const jwt = issuer.issueUserJWT(sk, uk, 'ACC', { name: 'test' });
    const result = issuer.verifyJWTSignature(jwt, sk.publicKey, (data, sig) => sk.verify(data, sig));
    expect(result.valid).toBe(true);
  });

  it('should reject JWT with wrong issuer signature', () => {
    const sk1 = nkeyMgr.generateKey('account');
    const sk2 = nkeyMgr.generateKey('account');
    const uk = nkeyMgr.generateKey('user');
    const jwt = issuer.issueUserJWT(sk1, uk, 'ACC', { name: 'test' });
    const result = issuer.verifyJWTSignature(jwt, sk2.publicKey, (data, sig) => sk2.verify(data, sig));
    expect(result.valid).toBe(false);
  });
});

// ─── ACLManager ────────────────────────────────────────────────────────────

describe('ACLManager', () => {
  let acl: ACLManager;

  beforeEach(() => {
    acl = new ACLManager();
  });

  it('should deny unknown identity by default', () => {
    expect(acl.canPublish('unknown', 'test.foo').allowed).toBe(false);
    expect(acl.canSubscribe('unknown', 'test.foo').allowed).toBe(false);
  });

  it('should allow publish matching allow pattern', () => {
    acl.addRule({
      identity: 'user1', account: 'TEST',
      publish: { allow: ['test.>'], deny: [] },
      subscribe: { allow: [], deny: [] },
      priority: 1,
    });
    expect(acl.canPublish('user1', 'test.foo').allowed).toBe(true);
    expect(acl.canPublish('user1', 'other.foo').allowed).toBe(false);
  });

  it('should deny publish matching deny pattern', () => {
    acl.addRule({
      identity: 'user1', account: 'TEST',
      publish: { allow: ['test.>'], deny: ['test.secret.>'] },
      subscribe: { allow: [], deny: [] },
      priority: 1,
    });
    expect(acl.canPublish('user1', 'test.foo').allowed).toBe(true);
    expect(acl.canPublish('user1', 'test.secret.data').allowed).toBe(false);
  });

  it('should handle single-level wildcard (*)', () => {
    acl.addRule({
      identity: 'user1', account: 'TEST',
      publish: { allow: ['*.events'], deny: [] },
      subscribe: { allow: [], deny: [] },
      priority: 1,
    });
    expect(acl.canPublish('user1', 'test.events').allowed).toBe(true);
    expect(acl.canPublish('user1', 'test.events.extra').allowed).toBe(false);
  });

  it('should handle multi-level wildcard (>)', () => {
    acl.addRule({
      identity: 'user1', account: 'TEST',
      publish: { allow: ['test.>'], deny: [] },
      subscribe: { allow: [], deny: [] },
      priority: 1,
    });
    expect(acl.canPublish('user1', 'test.a.b.c').allowed).toBe(true);
  });

  it('should respect priority ordering', () => {
    acl.addRule({
      identity: 'user1', account: 'TEST',
      publish: { allow: ['test.>'], deny: [] },
      subscribe: { allow: [], deny: [] },
      priority: 1,
    });
    acl.addRule({
      identity: 'user1', account: 'TEST',
      publish: { allow: [], deny: ['test.secret.>'] },
      subscribe: { allow: [], deny: [] },
      priority: 10,
    });
    expect(acl.canPublish('user1', 'test.secret').allowed).toBe(false);
  });

  it('should evaluate subscribe permission', () => {
    acl.addRule({
      identity: 'user2', account: 'TEST',
      publish: { allow: [], deny: [] },
      subscribe: { allow: ['events.>'], deny: ['events.admin.>'] },
      priority: 1,
    });
    expect(acl.canSubscribe('user2', 'events.user.login').allowed).toBe(true);
    expect(acl.canSubscribe('user2', 'events.admin.config').allowed).toBe(false);
  });

  it('should handle queue group restrictions', () => {
    acl.addRule({
      identity: 'worker', account: 'TEST',
      publish: { allow: ['tasks.>'], deny: [] },
      subscribe: { allow: ['tasks.>'], deny: [] },
      queueGroup: { allow: ['worker-queue'], deny: ['admin-queue'] },
      priority: 1,
    });
    expect(acl.canSubscribe('worker', 'tasks.work', 'worker-queue').allowed).toBe(true);
    expect(acl.canSubscribe('worker', 'tasks.work', 'admin-queue').allowed).toBe(false);
  });

  it('should handle response permissions', () => {
    acl.addRule({
      identity: 'requester', account: 'TEST',
      publish: { allow: ['req.>'], deny: [] },
      subscribe: { allow: [], deny: [] },
      response: { allow: ['_INBOX.>'], maxMessages: 5, ttl: 10 },
      priority: 1,
    });
    const result = acl.canReply('requester', '_INBOX.abc');
    expect(result.allowed).toBe(true);
    expect(result.maxMessages).toBe(5);
    expect(result.ttl).toBe(10);
  });

  it('should get effective permissions', () => {
    acl.addRule({
      identity: 'user1', account: 'TEST',
      publish: { allow: ['test.>'], deny: [] },
      subscribe: { allow: ['events.>'], deny: [] },
      queueGroup: { allow: ['q1'], deny: [] },
      priority: 1,
    });
    const eff = acl.getEffectivePermissions('user1');
    expect(eff.publish).toContain('test.>');
    expect(eff.subscribe).toContain('events.>');
    expect(eff.queueGroups).toContain('q1');
  });

  it('should remove rule', () => {
    acl.addRule({
      identity: 'temp', account: 'TEST',
      publish: { allow: ['x.>'], deny: [] },
      subscribe: { allow: [], deny: [] },
      priority: 1,
    });
    expect(acl.canPublish('temp', 'x.abc').allowed).toBe(true);
    acl.removeRule('temp');
    expect(acl.canPublish('temp', 'x.abc').allowed).toBe(false);
  });

  it('should clear all rules', () => {
    acl.addRule({
      identity: 'a', account: 'T',
      publish: { allow: ['a.>'], deny: [] },
      subscribe: { allow: [], deny: [] },
      priority: 1,
    });
    acl.addRule({
      identity: 'b', account: 'T',
      publish: { allow: ['b.>'], deny: [] },
      subscribe: { allow: [], deny: [] },
      priority: 1,
    });
    expect(acl.getRuleCount()).toBe(2);
    acl.clearRules();
    expect(acl.getRuleCount()).toBe(0);
  });

  it('should increment version on changes', () => {
    const v0 = acl.getVersion();
    acl.addRule({
      identity: 'u', account: 'T',
      publish: { allow: [], deny: [] },
      subscribe: { allow: [], deny: [] },
      priority: 1,
    });
    expect(acl.getVersion()).toBe(v0 + 1);
  });

  it('should evaluate permission via helper method', () => {
    acl.addRule({
      identity: 'u', account: 'T',
      publish: { allow: ['pub.>'], deny: [] },
      subscribe: { allow: ['sub.>'], deny: [] },
      priority: 1,
    });
    expect(acl.evaluatePermission('u', 'pub.x', 'publish')).toBe(true);
    expect(acl.evaluatePermission('u', 'sub.x', 'subscribe')).toBe(true);
    expect(acl.evaluatePermission('u', 'other.x', 'publish')).toBe(false);
  });

  it('should allow when defaultDeny is false and no rules match', () => {
    acl.setDefaultDeny(false);
    expect(acl.canPublish('unknown', 'anything').allowed).toBe(true);
  });
});

// ─── mTLSManager ───────────────────────────────────────────────────────────

describe('mTLSManager', () => {
  let mtls: mTLSManager;

  beforeEach(() => {
    mtls = new mTLSManager();
  });

  it('should create default TLS config', () => {
    const config = mtls.createDefaultConfig();
    expect(config.enabled).toBe(true);
    expect(config.verifyClient).toBe(true);
    expect(config.mapCertToUser).toBe(true);
    expect(config.minVersion).toBe('TLSv1.2');
    expect(config.maxVersion).toBe('TLSv1.3');
  });

  it('should create config with overrides', () => {
    const config = mtls.createDefaultConfig({ minVersion: 'TLSv1.3', verifyClient: false });
    expect(config.minVersion).toBe('TLSv1.3');
    expect(config.verifyClient).toBe(false);
  });

  it('should generate TLS config string', () => {
    const config = mtls.createDefaultConfig();
    const output = mtls.generateTLSConfigString(config);
    expect(output).toContain('tls: {');
    expect(output).toContain('verify: true');
    expect(output).toContain('TLSv1.2');
  });

  it('should generate full NATS server config', () => {
    const config = mtls.createDefaultConfig();
    const output = mtls.generateNATSServerConfig(config, { port: '4222' });
    expect(output).toContain('port: 4222');
    expect(output).toContain('authorization:');
  });

  it('should detect mTLS requirement', () => {
    const full = mtls.createDefaultConfig();
    expect(mtls.isMutualTLSRequired(full)).toBe(true);
    const noVerify = mtls.createDefaultConfig({ verifyClient: false });
    expect(mtls.isMutualTLSRequired(noVerify)).toBe(false);
  });

  it('should parse certificate PEM and extract CN', () => {
    const pem = 'CN=event-bus.ideia.io\nSerial Number: 12345';
    const cert = mtls.parseCertificatePEM(pem);
    expect(cert.commonName).toBe('event-bus.ideia.io');
    expect(cert.fingerprint).toBeTruthy();
  });

  it('should compute SHA-256 fingerprint', () => {
    const pem = 'test-cert-data';
    const fp1 = mtls.computeFingerprint(pem);
    const fp2 = mtls.computeFingerprint(pem);
    expect(fp1).toBe(fp2);
    expect(fp1.length).toBe(64);
  });

  it('should validate valid certificate', () => {
    const pem = 'CN=test-client';
    const cert = mtls.parseCertificatePEM(pem);
    const validity = mtls.validateCertificate(cert);
    expect(validity.valid).toBe(true);
    expect(validity.notBeforeValid).toBe(true);
    expect(validity.notAfterValid).toBe(true);
  });

  it('should detect expired certificate', () => {
    const expiredCert = {
      pem: 'CN=expired',
      commonName: 'expired',
      issuer: 'IDEIA Internal CA',
      notBefore: Date.now() - 400 * 86400000,
      notAfter: Date.now() - 1,
      serialNumber: 'EXP001',
      fingerprint: 'expired-fp',
    };
    const validity = mtls.validateCertificate(expiredCert);
    expect(validity.valid).toBe(false);
    expect(validity.reason).toContain('expired');
  });

  it('should detect not-yet-valid certificate', () => {
    const futureCert = {
      pem: 'CN=future',
      commonName: 'future',
      issuer: 'IDEIA Internal CA',
      notBefore: Date.now() + 86400000,
      notAfter: Date.now() + 400 * 86400000,
      serialNumber: 'FUT001',
      fingerprint: 'future-fp',
    };
    const validity = mtls.validateCertificate(futureCert);
    expect(validity.valid).toBe(false);
    expect(validity.reason).toContain('not yet valid');
  });

  it('should return TLS version recommendation', () => {
    expect(mtls.getTLSVersionRecommendation()).toBe('TLSv1.3');
  });

  it('should return recommended ciphers', () => {
    const ciphers = mtls.getRecommendedCiphers();
    expect(ciphers.length).toBeGreaterThanOrEqual(3);
    expect(ciphers[0]).toContain('TLS_AES');
  });
});

// ─── AuthCalloutHandler ────────────────────────────────────────────────────

describe('AuthCalloutHandler', () => {
  let handler: AuthCalloutHandler;
  let issuer: JWTIssuer;
  let nkeyMgr: NKEYManager;
  let logger: Logger;
  let config: AuthCalloutHandlerConfig;
  let database: UserDatabase;

  beforeEach(() => {
    nkeyMgr = new NKEYManager();
    issuer = new JWTIssuer();
    logger = createLogger('nats-security-test');
    const signingKey = nkeyMgr.generateKey('account');
    config = {
      accountSigningKey: signingKey,
      accountKey: 'ACCOUNT_PUB_KEY',
      tokenTTL: 86400000,
      maxSubscriptions: 100,
      maxData: -1,
      maxPayload: -1,
    };
    database = {
      async findByNKey(nkey: string): Promise<AuthCalloutUser | null> {
        if (nkey === 'VALID_NKEY') {
          const userKey = nkeyMgr.generateKey('user');
          return {
            identity: 'test-user',
            nkey: userKey.publicKey,
            userKey,
            permissions: {
              publish: ['test.>'],
              publishDeny: ['test.secret.>'],
              subscribe: ['test.>'],
              subscribeDeny: [],
            },
            tags: ['testing'],
          };
        }
        return null;
      },
    };
    handler = new AuthCalloutHandler(config, database, issuer, logger);
  });

  it('should authenticate valid user', async () => {
    const response = await handler.handleAuthCallout({
      clientNkey: 'VALID_NKEY',
      clientIp: '127.0.0.1',
      timestamp: Date.now(),
    });
    expect(response.ok).toBe(true);
    expect(response.jwt).toBeTruthy();
    expect(response.userNkey).toBeTruthy();
    expect(response.expiry).toBeTruthy();
  });

  it('should reject unknown user', async () => {
    const response = await handler.handleAuthCallout({
      clientNkey: 'UNKNOWN_NKEY',
      clientIp: '10.0.0.1',
      timestamp: Date.now(),
    });
    expect(response.ok).toBe(false);
    expect(response.error).toBeTruthy();
  });

  it('should track stats', async () => {
    await handler.handleAuthCallout({
      clientNkey: 'VALID_NKEY',
      clientIp: '1.2.3.4',
      timestamp: Date.now(),
    });
    await handler.handleAuthCallout({
      clientNkey: 'UNKNOWN',
      clientIp: '5.6.7.8',
      timestamp: Date.now(),
    });
    const stats = handler.getStats();
    expect(stats.requestCount).toBe(2);
    expect(stats.successCount).toBe(1);
    expect(stats.failureCount).toBe(1);
    expect(stats.successRate).toBe(0.5);
  });

  it('should reset stats', async () => {
    await handler.handleAuthCallout({
      clientNkey: 'UNKNOWN',
      clientIp: '1.1.1.1',
      timestamp: Date.now(),
    });
    handler.resetStats();
    const stats = handler.getStats();
    expect(stats.requestCount).toBe(0);
    expect(stats.successCount).toBe(0);
  });
});

// ─── MultiTenantIsolator ───────────────────────────────────────────────────

describe('MultiTenantIsolator', () => {
  let isolator: MultiTenantIsolator;

  beforeEach(() => {
    isolator = new MultiTenantIsolator();
  });

  it('should create tenant', () => {
    const tenant = isolator.createTenant('IDEIA_CORE', 'A_CORE_KEY');
    expect(tenant.name).toBe('IDEIA_CORE');
    expect(isolator.getTenantCount()).toBe(1);
  });

  it('should throw on duplicate tenant', () => {
    isolator.createTenant('DUPE', 'KEY');
    expect(() => isolator.createTenant('DUPE', 'KEY2')).toThrow();
  });

  it('should remove tenant', () => {
    isolator.createTenant('T1', 'K1');
    expect(isolator.tenantExists('T1')).toBe(true);
    expect(isolator.removeTenant('T1')).toBe(true);
    expect(isolator.tenantExists('T1')).toBe(false);
  });

  it('should list tenants', () => {
    isolator.createTenant('A', 'KA');
    isolator.createTenant('B', 'KB');
    expect(isolator.listTenants().length).toBe(2);
  });

  it('should add and remove users', () => {
    isolator.createTenant('T', 'K');
    isolator.addUserToTenant('T', {
      identity: 'user1', pubAllow: ['x.>'], pubDeny: [],
      subAllow: ['x.>'], subDeny: [], tags: [], ttlMs: 3600000,
    });
    expect(isolator.getUserCount('T')).toBe(1);
    expect(isolator.removeUserFromTenant('T', 'user1')).toBe(true);
    expect(isolator.getUserCount('T')).toBe(0);
  });

  it('should throw on duplicate user', () => {
    isolator.createTenant('T', 'K');
    isolator.addUserToTenant('T', {
      identity: 'u1', pubAllow: [], pubDeny: [],
      subAllow: [], subDeny: [], tags: [], ttlMs: 1000,
    });
    expect(() => isolator.addUserToTenant('T', {
      identity: 'u1', pubAllow: [], pubDeny: [],
      subAllow: [], subDeny: [], tags: [], ttlMs: 1000,
    })).toThrow();
  });

  it('should add and remove exports', () => {
    isolator.createTenant('SRC', 'K');
    isolator.addExport('SRC', {
      name: 'events-export', subject: 'events.>', type: 'stream',
      tokenReq: false, approvedAccounts: ['DST'],
    });
    expect(isolator.removeExport('SRC', 'events-export')).toBe(true);
  });

  it('should add and remove imports', () => {
    isolator.createTenant('DST', 'K');
    isolator.addImport('DST', {
      name: 'events-import', subject: 'events.>', account: 'SRC', type: 'stream',
    });
    expect(isolator.removeImport('DST', 'events-import')).toBe(true);
  });

  it('should connect two accounts', () => {
    isolator.createTenant('SRC', 'K1');
    isolator.createTenant('DST', 'K2');
    const connection = isolator.connectAccounts('SRC', 'DST', 'shared.>');
    expect(connection.exportDef.name).toBe('shared.>-export');
    expect(connection.importDef.name).toBe('shared.>-import');
  });

  it('should generate NATS config', () => {
    isolator.createTenant('CORE', 'K');
    isolator.addUserToTenant('CORE', {
      identity: 'bus', pubAllow: ['system.>'], pubDeny: [],
      subAllow: ['system.>'], subDeny: [], tags: [], ttlMs: 3600000,
    });
    const config = isolator.generateNATSConfig();
    expect(config).toContain('CORE');
    expect(config).toContain('bus');
    expect(config).toContain('system.>');
  });

  it('should count total users across tenants', () => {
    isolator.createTenant('A', 'K');
    isolator.createTenant('B', 'K');
    isolator.addUserToTenant('A', { identity: 'u1', pubAllow: [], pubDeny: [], subAllow: [], subDeny: [], tags: [], ttlMs: 1000 });
    isolator.addUserToTenant('A', { identity: 'u2', pubAllow: [], pubDeny: [], subAllow: [], subDeny: [], tags: [], ttlMs: 1000 });
    isolator.addUserToTenant('B', { identity: 'u3', pubAllow: [], pubDeny: [], subAllow: [], subDeny: [], tags: [], ttlMs: 1000 });
    expect(isolator.getTotalUserCount()).toBe(3);
  });
});

// ─── ThreatModelAnalyzer ────────────────────────────────────────────────────

describe('ThreatModelAnalyzer', () => {
  let analyzer: ThreatModelAnalyzer;

  beforeEach(() => {
    analyzer = new ThreatModelAnalyzer();
  });

  it('should analyze component with STRIDE threats', () => {
    const threats = analyzer.getDefaultCoreThreats();
    const model = analyzer.analyzeComponent('NATS Core', threats, [], []);
    expect(model.component).toBe('NATS Core');
    expect(model.threats.length).toBe(6);
  });

  it('should compute overall risk', () => {
    const threats = analyzer.getDefaultCoreThreats();
    const model = analyzer.analyzeComponent('NATS Core', threats, [], []);
    expect(model.overallRisk).toBe('critical');
  });

  it('should return default ACL threats', () => {
    const threats = analyzer.getDefaultACLThreats();
    expect(threats.length).toBe(2);
    expect(threats[0].category).toBe('information_disclosure');
    expect(threats[1].category).toBe('elevation_of_privilege');
  });

  it('should return default mTLS threats', () => {
    const threats = analyzer.getDefaultmTLSThreats();
    expect(threats.length).toBe(2);
  });

  it('should return default multi-tenant threats', () => {
    const threats = analyzer.getDefaultMultiTenantThreats();
    expect(threats.length).toBe(2);
  });

  it('should generate mitigation for each STRIDE category', () => {
    const threats = analyzer.getDefaultCoreThreats();
    for (const threat of threats) {
      const mitigation = analyzer.addMitigation(threat);
      expect(mitigation.threatId).toBe(`T-${threat.category}`);
      expect(mitigation.type).toBeTruthy();
    }
  });

  it('should list models', () => {
    analyzer.analyzeComponent('Core', analyzer.getDefaultCoreThreats(), [], []);
    analyzer.analyzeComponent('ACL', analyzer.getDefaultACLThreats(), [], []);
    expect(analyzer.listModels().length).toBe(2);
  });

  it('should compute overall risk profile', () => {
    analyzer.analyzeComponent('Core', analyzer.getDefaultCoreThreats(), [], []);
    analyzer.analyzeComponent('ACL', analyzer.getDefaultACLThreats(), [], []);
    const profile = analyzer.getOverallRiskProfile();
    expect(profile).toBe('critical');
  });

  it('should compute risk score', () => {
    const threats = analyzer.getDefaultCoreThreats();
    const score = analyzer.computeRiskScore(threats);
    expect(score).toBeGreaterThan(0);
  });

  it('should return none risk for empty threats', () => {
    const score = analyzer.computeRiskScore([]);
    expect(score).toBe(0);
  });
});

// ─── NATSAuthManager ────────────────────────────────────────────────────────

describe('NATSAuthManager', () => {
  let authManager: NATSAuthManager;
  let logger: Logger;

  beforeEach(() => {
    logger = createLogger('auth-manager-test');
    authManager = new NATSAuthManager(logger);
  });

  it('should initialize with operator key and JWT', () => {
    const result = authManager.initialize({
      operatorName: 'IDEIA_OPERATOR',
      accountServerUrl: 'nats://localhost:4222',
    });
    expect(result.operatorKey.publicKey.startsWith('O')).toBe(true);
    expect(result.operatorJWT.split('.').length).toBe(3);
  });

  it('should generate account JWT', () => {
    authManager.initialize({
      operatorName: 'OP',
      accountServerUrl: 'nats://localhost',
    });
    const jwt = authManager.generateAccountJWT('IDEIA_CORE');
    expect(jwt.split('.').length).toBe(3);
  });

  it('should generate and validate user JWT', () => {
    authManager.initialize({
      operatorName: 'OP',
      accountServerUrl: 'nats://localhost',
    });
    authManager.generateAccountJWT('IDEIA_CORE');
    const userJWT = authManager.generateUserJWT('IDEIA_CORE', 'event-bus', {
      pub: { allow: ['system.>'], deny: [] },
      sub: { allow: ['system.>'], deny: [] },
    });
    const validation = authManager.validateToken(userJWT.jwt);
    expect(validation.valid).toBe(true);
  });

  it('should revoke token and invalidate it', () => {
    authManager.initialize({
      operatorName: 'OP',
      accountServerUrl: 'nats://localhost',
    });
    authManager.generateAccountJWT('ACC');
    const userJWT = authManager.generateUserJWT('ACC', 'test-user');
    expect(authManager.validateToken(userJWT.jwt).valid).toBe(true);
    authManager.revokeToken('test-user');
    expect(authManager.validateToken(userJWT.jwt).valid).toBe(false);
  });

  it('should revoke NKey', () => {
    authManager.revokeNKey('COMPROMISED_NKEY');
    expect(authManager.isNKeyRevoked('COMPROMISED_NKEY', 1000)).toBe(true);
    expect(authManager.isNKeyRevoked('OTHER_NKEY', 1000)).toBe(false);
  });

  it('should create account via createAccount method', () => {
    authManager.initialize({
      operatorName: 'OP',
      accountServerUrl: 'nats://localhost',
    });
    const { accountKey, jwt } = authManager.createAccount('NEW_ACCOUNT');
    expect(accountKey.publicKey.startsWith('A')).toBe(true);
    expect(jwt.split('.').length).toBe(3);
  });

  it('should get account state', () => {
    authManager.initialize({
      operatorName: 'OP',
      accountServerUrl: 'nats://localhost',
    });
    authManager.createAccount('TEST_ACCT');
    const account = authManager.getAccount('TEST_ACCT');
    expect(account).toBeDefined();
    expect(account!.name).toBe('TEST_ACCT');
  });

  it('should list accounts', () => {
    authManager.initialize({
      operatorName: 'OP',
      accountServerUrl: 'nats://localhost',
    });
    authManager.createAccount('A1');
    authManager.createAccount('A2');
    expect(authManager.getAccounts().length).toBe(2);
  });

  it('should track active tokens', () => {
    authManager.initialize({
      operatorName: 'OP',
      accountServerUrl: 'nats://localhost',
    });
    authManager.generateAccountJWT('ACC');
    authManager.generateUserJWT('ACC', 'user-a');
    authManager.generateUserJWT('ACC', 'user-b');
    expect(authManager.getActiveTokens().size).toBe(2);
  });

  it('should track revoked count', () => {
    authManager.initialize({
      operatorName: 'OP',
      accountServerUrl: 'nats://localhost',
    });
    authManager.revokeNKey('NK1');
    authManager.revokeNKey('NK2');
    expect(authManager.getRevokedCount()).toBe(2);
  });

  it('should expose sub-managers', () => {
    expect(authManager.getNKeyManager()).toBeInstanceOf(NKEYManager);
    expect(authManager.getJWTIssuer()).toBeInstanceOf(JWTIssuer);
    expect(authManager.getACLManager()).toBeInstanceOf(ACLManager);
  });

  it('should return null operator key before init', () => {
    expect(authManager.getOperatorKey()).toBeNull();
  });
});
