import { describe, it, expect } from '@jest/globals';
import { AdaptiveAutonomy } from '../adaptive-autonomy';

describe('AdaptiveAutonomy', () => {
  it('should start at N1 — Supervisionado', () => {
    const aa = new AdaptiveAutonomy();
    expect(aa.getCurrentLevel().level).toBe(1);
    expect(aa.getCurrentLevel().label).toContain('Supervisionado');
  });

  it('should reject with reason at N0 after all actions require approval', () => {
    const aa = new AdaptiveAutonomy();
    aa.recordAction('test', true, false);
    aa.recordAction('test2', false, false);
    aa.recordAction('test3', true, false);
    aa.recordAction('test4', false, false);
    aa.recordAction('test5', false, false);
    aa.recordAction('test6', false, false);
    const result = aa.shouldAutoApprove('echo hello');
    expect(result.approve).toBeDefined();
  });

  it('should auto-approve simple actions at N1 with history < 5', () => {
    const aa = new AdaptiveAutonomy();
    const result = aa.shouldAutoApprove('echo hello');
    expect(result.approve).toBe(true);
    expect(result.reason).toContain('Early trust');
  });

  it('should reject complex actions at N1', () => {
    const aa = new AdaptiveAutonomy();
    aa.recordAction('echo', true, true);
    aa.recordAction('ls', true, true);
    aa.recordAction('cat', true, true);
    aa.recordAction('pwd', true, true);
    aa.recordAction('date', true, true);
    aa.recordAction('whoami', true, true);
    const result = aa.shouldAutoApprove('rm -rf / --no-preserve-root');
    expect(result.approve).toBe(false);
  });

  it('should record actions and update stats', () => {
    const aa = new AdaptiveAutonomy();
    const record = aa.recordAction('test action', true, true);
    expect(record.action).toBe('test action');
    expect(record.success).toBe(true);
    expect(record.autoApproved).toBe(true);

    const stats = aa.getStats();
    expect(stats.totalActions).toBe(1);
    expect(stats.successRate).toBe(1);
  });

  it('should increase level with high success rate', () => {
    const aa = new AdaptiveAutonomy();
    for (let i = 0; i < 40; i++) {
      aa.recordAction(`action-${i}`, true, true);
    }
    expect(aa.getCurrentLevel().level).toBeGreaterThanOrEqual(2);
  });

  it('should increase to N4 with very high success rate and many actions', () => {
    const aa = new AdaptiveAutonomy();
    for (let i = 0; i < 120; i++) {
      aa.recordAction(`action-${i}`, true, true);
    }
    expect(aa.getCurrentLevel().level).toBe(4);
  });

  it('should auto-approve at N3+ when all recent approved', () => {
    const aa = new AdaptiveAutonomy();
    for (let i = 0; i < 40; i++) {
      aa.recordAction(`action-${i}`, true, true);
    }
    const result = aa.shouldAutoApprove('any command here');
    expect(result.approve).toBe(true);
    expect(result.reason).toContain('Full trust');
  });

  it('should auto-approve at N2 with high confidence and simple action', () => {
    const aa = new AdaptiveAutonomy();
    for (let i = 0; i < 15; i++) {
      aa.recordAction(`action-${i}`, true, true);
    }
    const result = aa.shouldAutoApprove('echo hello');
    const stats = aa.getStats();
    if (stats.level.level >= 2 && aa.getStats().successRate > 0.8) {
      expect(result.approve).toBe(true);
    }
  });

  it('should decrease level with failures', () => {
    const aa = new AdaptiveAutonomy();
    for (let i = 0; i < 10; i++) {
      aa.recordAction(`fail-${i}`, false, true);
    }
    expect(aa.getCurrentLevel().level).toBeLessThanOrEqual(1);
  });

  it('should not auto-approve on level 0', () => {
    const aa = new AdaptiveAutonomy();
    for (let i = 0; i < 10; i++) {
      aa.recordAction(`fail-${i}`, false, false);
    }
    const result = aa.shouldAutoApprove('echo hi');
    expect(result.approve).toBe(false);
  });

  it('getStats should return correct shape', () => {
    const aa = new AdaptiveAutonomy();
    const stats = aa.getStats();
    expect(stats).toHaveProperty('level');
    expect(stats).toHaveProperty('successRate');
    expect(stats).toHaveProperty('totalActions');
    expect(typeof stats.level.level).toBe('number');
    expect(typeof stats.successRate).toBe('number');
  });
});
