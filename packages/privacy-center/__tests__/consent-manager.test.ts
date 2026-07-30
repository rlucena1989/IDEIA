import { ConsentManager } from '../src/consent-manager';

describe('ConsentManager', () => {
  let manager: ConsentManager;

  beforeEach(() => {
    manager = new ConsentManager();
  });

  test('recordConsent creates a consent record', () => {
    const record = manager.recordConsent('user-1', 'data-processing');
    expect(record.userId).toBe('user-1');
    expect(record.purpose).toBe('data-processing');
    expect(record.status).toBe('granted');
    expect(record.id).toBeDefined();
    expect(record.grantedAt).toBeDefined();
  });

  test('recordConsent stores multiple consents per user', () => {
    manager.recordConsent('user-1', 'marketing');
    manager.recordConsent('user-1', 'analytics');
    const consents = manager.getUserConsents('user-1');
    expect(consents).toHaveLength(2);
  });

  test('revokeConsent updates consent to revoked', () => {
    const record = manager.recordConsent('user-2', 'tracking');
    const revoked = manager.revokeConsent(record.id);
    expect(revoked!.status).toBe('revoked');
    expect(revoked!.revokedAt).toBeDefined();
  });

  test('revokeConsent returns undefined for unknown ID', () => {
    expect(manager.revokeConsent('nonexistent')).toBeUndefined();
  });

  test('getUserConsents returns empty array for unknown user', () => {
    expect(manager.getUserConsents('unknown')).toEqual([]);
  });

  test('checkConsent returns true for granted consent', () => {
    manager.recordConsent('user-3', 'email');
    expect(manager.checkConsent('user-3', 'email')).toBe(true);
  });

  test('checkConsent returns false for revoked consent', () => {
    const record = manager.recordConsent('user-3', 'email');
    manager.revokeConsent(record.id);
    expect(manager.checkConsent('user-3', 'email')).toBe(false);
  });

  test('checkConsent returns false when no consent exists', () => {
    expect(manager.checkConsent('user-4', 'unknown-purpose')).toBe(false);
  });

  test('expireConsent marks consent as expired', () => {
    const record = manager.recordConsent('user-5', 'beta');
    const expired = manager.expireConsent(record.id);
    expect(expired!.status).toBe('expired');
    expect(manager.checkConsent('user-5', 'beta')).toBe(false);
  });

  test('autoExpire expires consents past their expiry', () => {
    const past = new Date(2020, 1, 1);
    manager.recordConsent('user-6', 'trial', past);
    const count = manager.autoExpire(new Date());
    expect(count).toBe(1);
    expect(manager.checkConsent('user-6', 'trial')).toBe(false);
  });
});
