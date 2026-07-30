import { createEvolutionAudit } from '../evolution-audit';

describe('createEvolutionAudit', () => {
  it('creates an audit entry with all fields', () => {
    const entry = createEvolutionAudit({
      planId: 'plan-001',
      action: 'enable feature X',
      before: 'disabled',
      after: 'enabled',
      success: true,
    });
    expect(entry.auditId).toBeDefined();
    expect(entry.planId).toBe('plan-001');
    expect(entry.action).toBe('enable feature X');
    expect(entry.before).toBe('disabled');
    expect(entry.after).toBe('enabled');
    expect(entry.success).toBe(true);
    expect(entry.timestamp).toBeDefined();
  });

  it('creates a failed audit entry', () => {
    const entry = createEvolutionAudit({
      planId: 'plan-002',
      action: 'migrate',
      before: 'v1',
      after: 'v2',
      success: false,
    });
    expect(entry.success).toBe(false);
  });

  it('generates unique audit IDs', () => {
    const e1 = createEvolutionAudit({ planId: 'p1', action: 'a', before: 'b', after: 'c', success: true });
    const e2 = createEvolutionAudit({ planId: 'p1', action: 'a', before: 'b', after: 'c', success: true });
    expect(e1.auditId).not.toBe(e2.auditId);
  });
});
