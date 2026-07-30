import { IPCSecureProtocol } from '../protocol';
import { CapabilityChecker, issueToken } from '../capability-checker';
import { sanitizeIpcParams } from '../sanitize';
import { SideChannelPrevention } from '../side-channel';
import { AntiReplayProtection } from '../anti-replay';
import { FsScopeValidator } from '../fs-scope';

describe('IPCSecureProtocol', () => {
  const hmacKey = Buffer.alloc(32, 0xaa);
  const encKey = Buffer.alloc(32, 0xbb);
  let protocol: IPCSecureProtocol;

  beforeEach(() => {
    protocol = new IPCSecureProtocol(hmacKey, encKey);
  });

  it('should encrypt and decrypt', () => {
    const plaintext = Buffer.from('Hello IPC Security');
    const { ciphertext, nonce } = protocol.encrypt(plaintext);
    const decrypted = protocol.decrypt(ciphertext, nonce);
    expect(decrypted.toString()).toBe('Hello IPC Security');
  });

  it('should create and verify request HMAC', () => {
    const request = protocol.createRequest('fs:read', { path: '/test.txt' }, 'token123', 'renderer');
    expect(protocol.verify(request)).toBe(true);
  });

  it('should create and verify response HMAC', () => {
    const request = protocol.createRequest('test:method', {}, 'tok', 'src');
    const response = protocol.createResponse(request, true, { result: 'ok' });
    expect(protocol.verify(response)).toBe(true);
  });

  it('should detect tampered HMAC', () => {
    const request = protocol.createRequest('fs:read', {}, 'tok', 'src');
    request.hmac[0] ^= 0xff;
    expect(protocol.verify(request)).toBe(false);
  });

  it('should validate timestamp within window', () => {
    const request = protocol.createRequest('test', {}, 'tok', 'src');
    expect(protocol.verifyTimestamp(request, 10000)).toBe(true);
  });
});

describe('CapabilityChecker', () => {
  it('should issue and verify tokens', () => {
    const token = issueToken('agent-1', ['fs:read', 'fs:write'], { 'fs:read': ['/home/*'] }, 3600);
    expect(token).toContain('.');
    const parts = token.split('.');
    expect(parts.length).toBe(3);
  });

  it('should check permissions correctly', () => {
    const checker = new CapabilityChecker('');
    const token = issueToken('agent-1', ['fs:read'], {}, 3600);
    const decoded = checker.verifyToken(token);
    expect(decoded.sub).toBe('agent-1');
    expect(decoded.permissions).toContain('fs:read');
  });
});

describe('sanitizeIpcParams', () => {
  it('should strip __proto__ key from parsed objects', () => {
    const input = { ['__proto__'.toString()]: { pollution: true }, normal: 'value' };
    const sanitized = sanitizeIpcParams(input);
    expect(Object.prototype.hasOwnProperty.call(sanitized, '__proto__')).toBe(false);
    expect(Object.prototype.hasOwnProperty.call(sanitized, 'normal')).toBe(true);
    expect((sanitized as any).normal).toBe('value');
  });

  it('should strip constructor and prototype keys', () => {
    const input = { constructor: { payload: true }, prototype: { poisoned: true }, data: 'ok' };
    const sanitized = sanitizeIpcParams(input);
    expect(Object.prototype.hasOwnProperty.call(sanitized, 'constructor')).toBe(false);
    expect(Object.prototype.hasOwnProperty.call(sanitized, 'prototype')).toBe(false);
    expect(Object.prototype.hasOwnProperty.call(sanitized, 'data')).toBe(true);
    expect((sanitized as any).data).toBe('ok');
  });
});

describe('SideChannelPrevention', () => {
  it('should return safe error message', () => {
    const err = new Error('Sensitive database error: connection refused');
    expect(SideChannelPrevention.getSafeErrorMessage(err)).toBe('Access denied');
  });

  it('should produce constant-size error responses', () => {
    const resp = SideChannelPrevention.constantErrorResponse();
    expect(resp.length % 256).toBe(0);
  });
});

describe('AntiReplayProtection', () => {
  it('should detect duplicate nonces', () => {
    const arp = new AntiReplayProtection(5000);
    const msg = { id: 'msg-1', timestamp: BigInt(Date.now()) * 1_000_000n, source: 'test' };
    expect(arp.check(msg)).toBe(true);
    expect(arp.check(msg)).toBe(false);
    arp.dispose();
  });
});

describe('FsScopeValidator', () => {
  it('should allow paths within scope', async () => {
    const validator = new FsScopeValidator([__dirname]);
    const result = await validator.validate(__filename);
    expect(result).toBe(__filename);
  });

  it('should reject paths outside scope', async () => {
    const validator = new FsScopeValidator(['/tmp/allowed']);
    await expect(validator.validate('/etc/passwd')).rejects.toThrow('Path not in allowed scope');
  });

  it('should reject paths outside scope', async () => {
    const validator = new FsScopeValidator(['/tmp']);
    await expect(validator.validate('/etc/passwd')).rejects.toThrow('Path not in allowed scope');
  });
});
