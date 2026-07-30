import { buildEcosystemReport } from '../ecosystem-report';
import { DomainNode } from '../ecosystem-types';
import { AuditEntry } from '../federation-auditor';

function makeDomain(overrides: Partial<DomainNode> = {}): DomainNode {
  return {
    domainId: 'test-id',
    name: 'test-domain',
    type: 'team',
    trustLevel: 'medium',
    status: 'healthy',
    scope: [],
    owners: [],
    policies: [],
    ...overrides,
  };
}

function makeAudit(overrides: Partial<AuditEntry> = {}): AuditEntry {
  return {
    auditId: 'audit-1',
    subject: 'test',
    action: 'sync',
    outcome: 'success',
    timestamp: new Date().toISOString(),
    ...overrides,
  };
}

describe('ecosystem-report', () => {
  test('buildEcosystemReport returns report with correct totals', () => {
    const domains = [makeDomain(), makeDomain({ domainId: 'd2', name: 'd2' })];
    const audits = [makeAudit()];
    const report = buildEcosystemReport(domains, audits);
    expect(report.totalDomains).toBe(2);
    expect(report.totalAudits).toBe(1);
  });

  test('counts healthy domains', () => {
    const domains = [
      makeDomain({ domainId: 'd1', status: 'healthy' }),
      makeDomain({ domainId: 'd2', status: 'healthy' }),
      makeDomain({ domainId: 'd3', status: 'blocked' }),
    ];
    const report = buildEcosystemReport(domains, []);
    expect(report.healthyDomains).toBe(2);
  });

  test('counts blocked domains', () => {
    const domains = [
      makeDomain({ domainId: 'd1', status: 'blocked' }),
      makeDomain({ domainId: 'd2', status: 'degraded' }),
    ];
    const report = buildEcosystemReport(domains, []);
    expect(report.blockedDomains).toBe(1);
  });

  test('generatedAt is an ISO string', () => {
    const report = buildEcosystemReport([], []);
    expect(report.generatedAt).toBeDefined();
    expect(() => new Date(report.generatedAt)).not.toThrow();
  });

  test('summary contains domain and audit info', () => {
    const domains = [makeDomain(), makeDomain()];
    const audits = [makeAudit()];
    const report = buildEcosystemReport(domains, audits);
    expect(report.summary.length).toBeGreaterThan(0);
    expect(report.summary[0]).toContain('2');
    expect(report.summary[2]).toContain('1');
  });

  test('empty domains and audits', () => {
    const report = buildEcosystemReport([], []);
    expect(report.totalDomains).toBe(0);
    expect(report.healthyDomains).toBe(0);
    expect(report.blockedDomains).toBe(0);
    expect(report.totalAudits).toBe(0);
  });
});
