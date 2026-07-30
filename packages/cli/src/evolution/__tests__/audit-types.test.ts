import type { EvolutionAuditEntry, EvolutionAuditTrail } from '../audit-types';

describe('EvolutionAuditEntry type', () => {
  it('constructs a valid entry', () => {
    const entry: EvolutionAuditEntry = {
      auditId: 'audit-001',
      requestId: 'req-001',
      command: 'generate',
      action: 'create',
      rationale: 'Initial generation',
      createdAt: new Date().toISOString(),
      result: 'ok',
      notes: ['all good'],
    };
    expect(entry.auditId).toBe('audit-001');
    expect(entry.result).toBe('ok');
  });

  it('accepts all result variants', () => {
    const results: EvolutionAuditEntry['result'][] = ['ok', 'warning', 'blocked', 'failed'];
    for (const result of results) {
      const entry: EvolutionAuditEntry = {
        auditId: 'x',
        requestId: 'y',
        command: 'test',
        action: 'test',
        rationale: 'test',
        createdAt: new Date().toISOString(),
        result,
        notes: [],
      };
      expect(entry.result).toBe(result);
    }
  });
});

describe('EvolutionAuditTrail type', () => {
  it('constructs a valid audit trail', () => {
    const trail: EvolutionAuditTrail = {
      generatedAt: new Date().toISOString(),
      entries: [],
    };
    expect(trail.entries).toHaveLength(0);
  });

  it('holds multiple entries', () => {
    const entry: EvolutionAuditEntry = {
      auditId: '1',
      requestId: 'r1',
      command: 'sync',
      action: 'update',
      rationale: 'sync needed',
      createdAt: new Date().toISOString(),
      result: 'ok',
      notes: [],
    };
    const trail: EvolutionAuditTrail = {
      generatedAt: new Date().toISOString(),
      entries: [entry, entry],
    };
    expect(trail.entries).toHaveLength(2);
  });
});
