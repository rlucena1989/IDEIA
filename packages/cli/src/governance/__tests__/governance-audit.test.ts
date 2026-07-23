import { describe, it, expect } from '@jest/globals';
import { buildGovernanceAudit } from '../governance-audit';

describe('governance-audit', () => {
  it('buildGovernanceAudit should be defined', () => {
    expect(buildGovernanceAudit).toBeDefined();
  });

  it('should create audit entry with auditId', () => {
    const entry = buildGovernanceAudit({
      policyId: 'p1', action: 'generate', contextId: 'ctx-1',
      allowed: true, requiresApproval: true, approved: true,
      decidedAt: new Date().toISOString(), reason: 'Allowed',
    });
    expect(entry.auditId).toBeDefined();
    expect(entry.action).toBe('generate');
    expect(entry.allowed).toBe(true);
  });
});
