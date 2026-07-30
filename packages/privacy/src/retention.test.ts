import { DataRetentionManager } from './retention';

describe('DataRetentionManager', () => {
  it('should apply retention rules by domain', () => {
    const rules = [
      { id: 'r1', domain: 'logs/*', maxAgeDays: 30, action: 'purge' as const, priority: 1 },
      { id: 'r2', domain: 'audit/*', maxAgeDays: 365, action: 'archive' as const, priority: 2 },
    ];
    const mgr = new DataRetentionManager(rules);
    const logsRule = mgr.getApplicableRule('logs/app.log');
    const auditRule = mgr.getApplicableRule('audit/access.log');
    expect(logsRule?.maxAgeDays).toBe(30);
    expect(auditRule?.maxAgeDays).toBe(365);
  });

  it('should return undefined for unknown domain', () => {
    const mgr = new DataRetentionManager([]);
    expect(mgr.getApplicableRule('unknown/data.txt')).toBeUndefined();
  });

  it('should calculate purge date correctly', () => {
    const rules = [{ id: 'r3', domain: '*', maxAgeDays: 30, action: 'purge' as const, priority: 0 }];
    const mgr = new DataRetentionManager(rules);
    const date = mgr.calculatePurgeDate('test/data', new Date('2026-01-01'));
    expect(date?.toISOString()).toContain('2026-01-31');
  });

  it('should honor rule priority ordering', () => {
    const rules = [
      { id: 'r4', domain: 'logs/*', maxAgeDays: 90, action: 'archive' as const, priority: 5 },
      { id: 'r5', domain: '*', maxAgeDays: 30, action: 'purge' as const, priority: 1 },
    ];
    const mgr = new DataRetentionManager(rules);
    const rule = mgr.getApplicableRule('logs/app.log');
    expect(rule?.id).toBe('r4');
  });

  it('should support exempt patterns', () => {
    const rules = [{
      id: 'r6', domain: 'logs/*', maxAgeDays: 30, action: 'purge' as const, priority: 1,
      exemptPatterns: [/important/],
    }];
    const mgr = new DataRetentionManager(rules);
    const exempted = mgr.getApplicableRule('logs/important.log', { name: 'important' });
    const normal = mgr.getApplicableRule('logs/other.log', { name: 'other' });
    expect(exempted).toBeUndefined();
    expect(normal?.maxAgeDays).toBe(30);
  });

  it('should log purge history', () => {
    const mgr = new DataRetentionManager([]);
    mgr.logPurge('r-test', 100);
    const history = mgr.getPurgeHistory();
    expect(history).toHaveLength(1);
    expect(history[0].recordsPurged).toBe(100);
  });
});
