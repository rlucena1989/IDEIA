import { GovernanceService } from '../src/governance-service';
import { ComplianceChecker } from '../src/compliance-checker';
import type { GapRecord, DocumentRecord } from '../src/types';

describe('GovernanceService', () => {
  let service: GovernanceService;

  beforeEach(() => {
    service = new GovernanceService();
  });

  it('should add and list gaps', () => {
    const gap = service.addGap({ description: 'Missing tests', severity: 'high', status: 'open', module: 'core' });
    expect(gap.id).toBeDefined();
    expect(gap.createdAt).toBeDefined();
    expect(service.listGaps()).toHaveLength(1);
    expect(service.listGaps('high')).toHaveLength(1);
    expect(service.listGaps('low')).toHaveLength(0);
  });

  it('should resolve a gap', () => {
    const gap = service.addGap({ description: 'Bug', severity: 'critical', status: 'open', module: 'api' });
    expect(service.resolveGap(gap.id)).toBe(true);
    expect(service.listGaps()[0]?.status).toBe('resolved');
    expect(service.resolveGap('nonexistent')).toBe(false);
  });

  it('should generate compliance report', () => {
    service.addGap({ description: 'Critical issue', severity: 'critical', status: 'open', module: 'core' });
    const report = service.getComplianceReport();
    expect(report.totalGaps).toBe(1);
    expect(report.openGaps).toBe(1);
    expect(report.compliant).toBe(false);
  });
});

describe('ComplianceChecker', () => {
  let checker: ComplianceChecker;

  beforeEach(() => {
    checker = new ComplianceChecker();
  });

  it('should pass when no critical gaps open', () => {
    const gaps: GapRecord[] = [
      { id: '1', description: 'Minor', severity: 'low', status: 'open', createdAt: '', module: 'core' },
      { id: '2', description: 'Fixed critical', severity: 'critical', status: 'resolved', createdAt: '', resolvedAt: '', module: 'core' },
    ];
    const docs: DocumentRecord[] = [{ id: 'd1', path: '/docs/guide.md', title: 'Guide', lastUpdated: '' }];
    const report = checker.check(gaps, docs, ['doc1.md']);
    expect(report.compliant).toBe(true);
    expect(report.checks).toHaveLength(3);
  });

  it('should fail when critical gaps are open', () => {
    const gaps: GapRecord[] = [
      { id: '1', description: 'Critical bug', severity: 'critical', status: 'open', createdAt: '', module: 'core' },
    ];
    const docs: DocumentRecord[] = [];
    const report = checker.check(gaps, docs, []);
    expect(report.compliant).toBe(false);
  });
});
