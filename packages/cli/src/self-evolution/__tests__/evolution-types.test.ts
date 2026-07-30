import type { EvolutionChange, EvolutionPlan, EvolutionResult, EvolutionAuditEntry } from '../evolution-types';

describe('EvolutionChange type', () => {
  it('constructs enable change', () => {
    const change: EvolutionChange = {
      changeId: 'c1',
      type: 'enable',
      target: 'feature-x',
      to: true,
      reason: 'Ready for rollout',
    };
    expect(change.type).toBe('enable');
    expect(change.to).toBe(true);
  });

  it('constructs disable change', () => {
    const change: EvolutionChange = {
      changeId: 'c2',
      type: 'disable',
      target: 'feature-y',
      from: true,
      to: false,
      reason: 'Deprecated',
    };
    expect(change.type).toBe('disable');
    expect(change.from).toBe(true);
  });

  it('constructs replace change', () => {
    const change: EvolutionChange = {
      changeId: 'c3',
      type: 'replace',
      target: 'engine',
      from: 'old-engine',
      to: 'new-engine',
      reason: 'Performance improvement',
    };
    expect(change.from).toBe('old-engine');
    expect(change.to).toBe('new-engine');
  });

  it('constructs tune change with number values', () => {
    const change: EvolutionChange = {
      changeId: 'c4',
      type: 'tune',
      target: 'threshold',
      from: 0.8,
      to: 0.9,
      reason: 'Increase sensitivity',
    };
    expect(typeof change.from).toBe('number');
    expect(typeof change.to).toBe('number');
  });

  it('constructs migrate change', () => {
    const change: EvolutionChange = {
      changeId: 'c5',
      type: 'migrate',
      target: 'storage',
      from: 'sqlite',
      to: 'postgres',
      reason: 'Scaling',
    };
    expect(change.type).toBe('migrate');
  });

  it('from and to can be optional', () => {
    const change: EvolutionChange = {
      changeId: 'c6',
      type: 'enable',
      target: 'feature',
      to: true,
      reason: 'test',
    };
    expect(change.from).toBeUndefined();
  });
});

describe('EvolutionPlan type', () => {
  it('constructs a plan', () => {
    const plan: EvolutionPlan = {
      planId: 'plan-001',
      createdAt: new Date().toISOString(),
      changes: [],
      requiresApproval: false,
      rollbackAvailable: true,
    };
    expect(plan.planId).toBe('plan-001');
  });
});

describe('EvolutionResult type', () => {
  it('constructs a result', () => {
    const result: EvolutionResult = {
      planId: 'plan-001',
      applied: true,
      appliedAt: new Date().toISOString(),
      notes: ['Applied successfully'],
    };
    expect(result.applied).toBe(true);
    expect(result.notes).toHaveLength(1);
  });
});

describe('EvolutionAuditEntry type', () => {
  it('constructs an audit entry', () => {
    const entry: EvolutionAuditEntry = {
      auditId: 'audit-001',
      planId: 'plan-001',
      action: 'enable',
      before: 'off',
      after: 'on',
      timestamp: new Date().toISOString(),
      success: true,
    };
    expect(entry.success).toBe(true);
  });
});
