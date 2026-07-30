jest.mock('@ideia/logger', () => {
  const mock = { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() };
  return { createLogger: () => mock };
});

import { RetentionPolicy} from '../src/retention';

describe('RetentionPolicy', () => {
  describe('constructor', () => {
    it('should use default policies when no config provided', () => {
      const rp = new RetentionPolicy();
      expect(rp.getPolicy('code')).toBeDefined();
      expect(rp.getPolicy('logs')).toBeDefined();
      expect(rp.getPolicy('cache')).toBeDefined();
      expect(rp.getPolicy('telemetry')).toBeDefined();
      expect(rp.getPolicy('backups')).toBeDefined();
    });

    it('should use provided policies', () => {
      const rp = new RetentionPolicy([
        { type: 'custom', maxAgeDays: 10, action: 'delete' },
      ]);
      expect(rp.getPolicy('custom')).toBeDefined();
      expect(rp.getPolicy('code')).toBeUndefined();
    });
  });

  describe('definePolicy', () => {
    it('should add a new policy', () => {
      const rp = new RetentionPolicy([]);
      rp.definePolicy('test', 15, 'delete');
      const policy = rp.getPolicy('test');
      expect(policy).toBeDefined();
      expect(policy!.maxAgeDays).toBe(15);
      expect(policy!.action).toBe('delete');
    });

    it('should overwrite existing policy', () => {
      const rp = new RetentionPolicy([]);
      rp.definePolicy('test', 15, 'delete');
      rp.definePolicy('test', 30, 'archive');
      const policy = rp.getPolicy('test');
      expect(policy!.maxAgeDays).toBe(30);
      expect(policy!.action).toBe('archive');
    });
  });

  describe('getPolicy', () => {
    it('should return undefined for unknown policy type', () => {
      const rp = new RetentionPolicy([]);
      expect(rp.getPolicy('unknown')).toBeUndefined();
    });

    it('should return policy for known type', () => {
      const rp = new RetentionPolicy();
      const policy = rp.getPolicy('logs');
      expect(policy!.type).toBe('logs');
      expect(policy!.maxAgeDays).toBe(90);
      expect(policy!.action).toBe('delete');
    });
  });

  describe('applyPolicies', () => {
    it('should pass through all records when no policy matches', () => {
      const rp = new RetentionPolicy([]);
      const data = new Map<string, unknown[]>([
        ['unknown', [{ id: 1 }, { id: 2 }]],
      ]);
      const result = rp.applyPolicies(data);
      expect(result.get('unknown')).toHaveLength(2);
    });

    it('should retain all records for Infinity retention', () => {
      const rp = new RetentionPolicy();
      const old = new Date(Date.now() - 1000 * 86400000).toISOString();
      const data = new Map<string, unknown[]>([
        ['code', [{ id: 1, timestamp: old }, { id: 2, timestamp: new Date().toISOString() }]],
      ]);
      const result = rp.applyPolicies(data);
      expect(result.get('code')).toHaveLength(2);
    });

    it('should remove records older than retention period', () => {
      const rp = new RetentionPolicy();
      const oldDate = new Date(Date.now() - 200 * 86400000).toISOString();
      const recentDate = new Date().toISOString();
      const data = new Map<string, unknown[]>([
        ['logs', [
          { id: 1, timestamp: oldDate },
          { id: 2, timestamp: recentDate },
        ]],
      ]);
      const result = rp.applyPolicies(data);
      expect(result.get('logs')).toHaveLength(1);
      expect((result.get('logs')![0] as Record<string, unknown>).id).toBe(2);
    });

    it('should handle records without timestamps by keeping them', () => {
      const rp = new RetentionPolicy();
      const data = new Map<string, unknown[]>([
        ['logs', [{ id: 1 }, { id: 2 }]],
      ]);
      const result = rp.applyPolicies(data);
      expect(result.get('logs')).toHaveLength(2);
    });

    it('should handle primitive records by keeping them', () => {
      const rp = new RetentionPolicy();
      const data = new Map<string, unknown[]>([
        ['logs', ['string-entry', 42]],
      ]);
      const result = rp.applyPolicies(data);
      expect(result.get('logs')).toHaveLength(2);
    });

    it('should handle empty data map', () => {
      const rp = new RetentionPolicy();
      const data = new Map<string, unknown[]>();
      const result = rp.applyPolicies(data);
      expect(result.size).toBe(0);
    });

    it('should use createdAt field as fallback timestamp', () => {
      const rp = new RetentionPolicy();
      const oldDate = new Date(Date.now() - 200 * 86400000).toISOString();
      const data = new Map<string, unknown[]>([
        ['logs', [{ id: 1, createdAt: oldDate }]],
      ]);
      const result = rp.applyPolicies(data);
      expect(result.get('logs')).toHaveLength(0);
    });
  });
});
