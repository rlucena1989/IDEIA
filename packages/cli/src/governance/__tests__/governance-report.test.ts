import { describe, it, expect } from '@jest/globals';
import { buildGovernanceReport } from '../governance-report';
import { GovernancePolicy } from '../policy-types';
import { GovernanceAuditEntry } from '../governance-audit';

describe('governance-report', () => {
  const makePolicy = (id: string, enabled: boolean): GovernancePolicy => ({
    policyId: id, name: id, description: '', enabled,
    appliesTo: ['state'], rules: [],
  });

  const makeAudit = (): GovernanceAuditEntry => ({
    auditId: 'a1', action: 'generate', contextId: 'ctx',
    allowed: true, requiresApproval: false,
    decidedAt: new Date().toISOString(), reason: 'ok',
  });

  it('should build report with policies and audits', () => {
    const report = buildGovernanceReport({
      policies: [makePolicy('p1', true), makePolicy('p2', true)],
      audits: [makeAudit()],
    });
    expect(report.totalPolicies).toBe(2);
    expect(report.enabledPolicies).toBe(2);
    expect(report.totalAuditEntries).toBe(1);
    expect(report.generatedAt).toBeDefined();
  });

  it('should count disabled policies correctly', () => {
    const report = buildGovernanceReport({
      policies: [makePolicy('p1', true), makePolicy('p2', false)],
      audits: [],
    });
    expect(report.totalPolicies).toBe(2);
    expect(report.enabledPolicies).toBe(1);
  });

  it('should include context when provided', () => {
    const report = buildGovernanceReport({
      policies: [],
      audits: [],
      context: { contextId: 'ctx-main', risk: 'high', allowAutoActions: false, requireApproval: true, policies: [] },
    });
    expect(report.currentContext).toBeDefined();
    expect(report.currentContext!.risk).toBe('high');
  });

  it('should generate valid summary', () => {
    const report = buildGovernanceReport({
      policies: [makePolicy('p1', true)],
      audits: [makeAudit(), makeAudit()],
    });
    expect(report.summary).toContain('1 política(s) registrada(s)');
    expect(report.summary).toContain('2 entrada(s) de auditoria');
  });

  it('should work with empty arrays', () => {
    const report = buildGovernanceReport({ policies: [], audits: [] });
    expect(report.totalPolicies).toBe(0);
    expect(report.enabledPolicies).toBe(0);
    expect(report.totalAuditEntries).toBe(0);
  });

  it('should include context in summary when provided', () => {
    const ctx = { contextId: 'ctx-risk', risk: 'critical', allowAutoActions: false, requireApproval: true, policies: [] };
    const report = buildGovernanceReport({ policies: [], audits: [], context: ctx });
    expect(report.summary.some(s => s.includes('critical'))).toBe(true);
  });
});
