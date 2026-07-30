import { EnterpriseComplianceEngine } from '../src/enterprise-compliance-engine';
import { EvidenceCollector } from '../src/evidence-collector';
import { AuditReportGenerator } from '../src/audit-report-generator';
import { ComplianceDashboard } from '../src/compliance-dashboard';
import { ControlMapper } from '../src/control-mapper';
import { RemediationPlanner } from '../src/remediation-planner';
import { ContinuousComplianceMonitor } from '../src/continuous-compliance-monitor';
import { Control, ComplianceFramework, FrameworkRequirement, Evidence } from '../src/types';

function makeControl(overrides: Partial<Control> = {}): Control {
  return {
    id: 'ctrl-1',
    framework: 'soc2',
    controlId: 'CC6.1',
    title: 'Logical Access',
    description: 'Test control',
    status: 'implemented',
    severity: 'critical',
    owner: 'security',
    category: 'security',
    evidenceTypes: ['access_review'],
    lastTested: '2026-07-01T00:00:00Z',
    nextTestDue: '2026-10-01T00:00:00Z',
    remediationNotes: null,
    dependsOn: [],
    ...overrides,
  };
}

function makeRequirement(overrides: Partial<FrameworkRequirement> = {}): FrameworkRequirement {
  return {
    id: 'req-1',
    framework: 'soc2',
    requirementId: 'CC6.1',
    title: 'Logical Access',
    description: 'Requirement description',
    category: 'security',
    mandatory: true,
    references: [],
    ...overrides,
  };
}

function makeEvidence(overrides: Partial<Evidence> = {}): Evidence {
  return {
    id: 'ev-1',
    type: 'configuration_snapshot',
    timestamp: '2026-07-01T00:00:00Z',
    source: 'automated_collector',
    content: { test: true },
    hash: 'abc123',
    metadata: {},
    retainedUntil: '2027-07-01T00:00:00Z',
    controlIds: ['CC6.1'],
    verified: true,
    chain: [],
    ...overrides,
  };
}

// --- EnterpriseComplianceEngine ---

describe('EnterpriseComplianceEngine', () => {
  let engine: EnterpriseComplianceEngine;

  beforeEach(() => {
    engine = new EnterpriseComplianceEngine();
  });

  it('should register and retrieve controls', () => {
    const ctrl = engine.registerControl(makeControl());
    expect(ctrl.id).toBeDefined();
    expect(engine.getControl(ctrl.id)).toBeDefined();
  });

  it('should retrieve controls by framework', () => {
    engine.registerControl(makeControl({ framework: 'soc2' }));
    engine.registerControl(makeControl({ framework: 'gdpr', controlId: 'Art.5' }));
    expect(engine.getControlsByFramework('soc2')).toHaveLength(1);
    expect(engine.getControlsByFramework('gdpr')).toHaveLength(1);
    expect(engine.getControlsByFramework('hipaa')).toHaveLength(0);
  });

  it('should retrieve controls by status', () => {
    engine.registerControl(makeControl({ status: 'implemented', controlId: 'CC1' }));
    engine.registerControl(makeControl({ status: 'not-implemented', controlId: 'CC2' }));
    expect(engine.getControlsByStatus('implemented')).toHaveLength(1);
    expect(engine.getControlsByStatus('not-implemented')).toHaveLength(1);
    expect(engine.getControlsByStatus('partial')).toHaveLength(0);
  });

  it('should retrieve controls by owner', () => {
    engine.registerControl(makeControl({ owner: 'security', controlId: 'CC1' }));
    engine.registerControl(makeControl({ owner: 'devops', controlId: 'CC2' }));
    expect(engine.getControlsByOwner('security')).toHaveLength(1);
    expect(engine.getControlsByOwner('devops')).toHaveLength(1);
  });

  it('should retrieve controls by dependency', () => {
    engine.registerControl(makeControl({ controlId: 'CC1', dependsOn: ['CC0'] }));
    engine.registerControl(makeControl({ controlId: 'CC2', dependsOn: ['CC0'] }));
    expect(engine.getControlsByDependency('CC0')).toHaveLength(2);
  });

  it('should update control status', () => {
    const ctrl = engine.registerControl(makeControl({ status: 'not-implemented' }));
    const result = engine.updateControlStatus(ctrl.id, 'implemented', 'Fixed');
    expect(result).toBe(true);
    const updated = engine.getControl(ctrl.id);
    expect(updated?.status).toBe('implemented');
  });

  it('should return false for non-existent control update', () => {
    expect(engine.updateControlStatus('nonexistent', 'implemented')).toBe(false);
  });

  it('should calculate framework score', () => {
    engine.registerControl(makeControl({ status: 'implemented', controlId: 'CC1' }));
    engine.registerControl(makeControl({ status: 'partial', controlId: 'CC2' }));
    engine.registerControl(makeControl({ status: 'not-implemented', controlId: 'CC3' }));
    const score = engine.getFrameworkScore('soc2');
    expect(score.total).toBe(3);
    expect(score.passing).toBe(1);
    expect(score.score).toBeGreaterThan(0);
  });

  it('should calculate overall compliance score', () => {
    engine.registerDefaultControls();
    const score = engine.calculateOverallScore();
    expect(score.overall).toBeGreaterThanOrEqual(0);
    expect(score.overall).toBeLessThanOrEqual(100);
    expect(score.byFramework).toBeDefined();
    expect(score.byDimension).toBeDefined();
  });

  it('should get requirements by framework', () => {
    const reqs = engine.getRequirementsByFramework('soc2');
    expect(reqs.length).toBeGreaterThan(0);
    expect(reqs[0].framework).toBe('soc2');
  });

  it('should run framework check', () => {
    engine.registerControl(makeControl({ status: 'implemented', controlId: 'CC1' }));
    engine.registerControl(makeControl({ status: 'not-implemented', controlId: 'CC2' }));
    const results = engine.runFrameworkCheck('soc2');
    expect(results).toHaveLength(2);
    expect(results.filter((r) => r.passed)).toHaveLength(1);
  });

  it('should run multi-framework check', () => {
    engine.registerControl(makeControl({ status: 'implemented', framework: 'soc2', controlId: 'CC1' }));
    engine.registerControl(makeControl({ status: 'implemented', framework: 'gdpr', controlId: 'Art.5' }));
    const results = engine.runMultiFrameworkCheck(['soc2', 'gdpr']);
    expect(results['soc2']).toBeDefined();
    expect(results['gdpr']).toBeDefined();
  });

  it('should register default controls across all frameworks', () => {
    engine.registerDefaultControls();
    const frameworks: ComplianceFramework[] = ['soc2', 'iso27001', 'gdpr', 'lgpd', 'hipaa', 'pci-dss'];
    for (const fw of frameworks) {
      expect(engine.getControlsByFramework(fw).length).toBeGreaterThan(0);
    }
  });

  it('should run scenario tests', () => {
    engine.addScenario({
      framework: 'soc2',
      requirementId: 'CC6.1',
      scenario: 'MFA should be implemented',
      expectedOutcome: 'pass',
      condition: () => false,
    });
    const results = engine.runScenarioTests();
    expect(results.total).toBe(1);
    expect(results.failed).toBe(1);
  });
});

// --- EvidenceCollector ---

describe('EvidenceCollector', () => {
  let collector: EvidenceCollector;

  beforeEach(() => {
    collector = new EvidenceCollector({
      types: ['configuration_snapshot', 'access_review', 'vulnerability_scan'],
      retentionDays: 365,
      storagePath: '/tmp/evidence',
      schedule: '0 2 * * *',
    });
  });

  it('should collect evidence', async () => {
    const evidence = await collector.collect('configuration_snapshot', { key: 'value' }, ['CC6.1']);
    expect(evidence.id).toBeDefined();
    expect(evidence.type).toBe('configuration_snapshot');
    expect(evidence.hash).toBeDefined();
    expect(evidence.chain).toHaveLength(1);
  });

  it('should retrieve evidence by type', async () => {
    await collector.collect('configuration_snapshot', {}, ['CC1']);
    await collector.collect('access_review', {}, ['CC2']);
    const snapshots = collector.getRecentByType('configuration_snapshot');
    expect(snapshots).toHaveLength(1);
  });

  it('should retrieve evidence for control', async () => {
    await collector.collect('configuration_snapshot', {}, ['CC6.1', 'CC6.2']);
    await collector.collect('access_review', {}, ['CC6.1']);
    const forControl = collector.getEvidenceForControl('CC6.1');
    expect(forControl).toHaveLength(2);
  });

  it('should get evidence by id', async () => {
    const ev = await collector.collect('configuration_snapshot', {}, ['CC1']);
    const found = collector.getEvidenceById(ev.id);
    expect(found).toBeDefined();
    expect(found!.id).toBe(ev.id);
  });

  it('should verify evidence integrity', async () => {
    const ev = await collector.collect('configuration_snapshot', { data: 'test' }, ['CC1']);
    const valid = collector.verifyEvidenceIntegrity(ev);
    expect(valid).toBe(true);
  });

  it('should verify chain integrity', async () => {
    const ev = await collector.collect('configuration_snapshot', {}, ['CC1']);
    const valid = collector.verifyChainIntegrity(ev);
    expect(valid).toBe(true);
  });

  it('should mark evidence as verified', async () => {
    const ev = await collector.collect('configuration_snapshot', {}, ['CC1']);
    const result = collector.verifyEvidence(ev.id);
    expect(result).toBe(true);
    const updated = collector.getEvidenceById(ev.id);
    expect(updated!.verified).toBe(true);
    expect(updated!.chain).toHaveLength(2);
  });

  it('should invalidate evidence', async () => {
    const ev = await collector.collect('configuration_snapshot', {}, ['CC1']);
    const result = collector.invalidateEvidence(ev.id, 'Tampered content');
    expect(result).toBe(true);
    const updated = collector.getEvidenceById(ev.id);
    expect(updated!.verified).toBe(false);
    expect(updated!.chain).toHaveLength(2);
  });

  it('should archive evidence', async () => {
    const ev = await collector.collect('configuration_snapshot', {}, ['CC1']);
    const result = collector.archiveEvidence(ev.id);
    expect(result).toBe(true);
    const updated = collector.getEvidenceById(ev.id);
    expect(updated!.chain).toHaveLength(2);
  });

  it('should detect tampered evidence', async () => {
    const ev = await collector.collect('configuration_snapshot', {}, ['CC1']);
    ev.content['tampered'] = true;
    const valid = collector.verifyEvidenceIntegrity(ev);
    expect(valid).toBe(false);
  });

  it('should generate coverage report', async () => {
    await collector.collect('configuration_snapshot', {}, ['CC1']);
    await collector.collect('access_review', {}, ['CC2']);
    const report = collector.generateCoverageReport();
    expect(report.totalCollected).toBe(2);
    expect(report.coveragePercent).toBeGreaterThan(0);
    expect(report.byType).toBeDefined();
  });

  it('should generate retention report', async () => {
    await collector.collect('configuration_snapshot', {}, ['CC1']);
    const report = collector.getRetentionReport();
    expect(report).toHaveLength(1);
    expect(report[0].daysRemaining).toBeGreaterThan(0);
    expect(report[0].expired).toBe(false);
  });

  it('should get evidence by source', async () => {
    const ev = await collector.collect('configuration_snapshot', {}, ['CC1']);
    const fromSource = collector.getEvidenceBySource(ev.source);
    expect(fromSource).toHaveLength(1);
  });

  it('should get unverified evidence', async () => {
    await collector.collect('configuration_snapshot', {}, ['CC1']);
    const unverified = collector.getUnverifiedEvidence();
    expect(unverified).toHaveLength(1);
  });
});

// --- AuditReportGenerator ---

describe('AuditReportGenerator', () => {
  let generator: AuditReportGenerator;
  let controls: Control[];

  beforeEach(() => {
    generator = new AuditReportGenerator();
    controls = [
      makeControl({ controlId: 'CC1', status: 'implemented', category: 'security' }),
      makeControl({ controlId: 'CC2', status: 'not-implemented', category: 'security' }),
      makeControl({ controlId: 'CC3', status: 'partial', category: 'availability' }),
    ];
  });

  it('should generate a single-framework audit report', () => {
    const report = generator.generateReport('soc2', controls, []);
    expect(report.framework).toBe('soc2');
    expect(report.controlCount).toBe(3);
    expect(report.overallScore).toBeGreaterThanOrEqual(0);
    expect(report.sections.length).toBeGreaterThan(0);
    expect(report.findings.length).toBeGreaterThan(0);
  });

  it('should generate multi-framework reports', () => {
    const reports = generator.generateMultiFrameworkReport(
      {
        soc2: [makeControl({ controlId: 'CC1' })],
        gdpr: [makeControl({ controlId: 'Art.5', framework: 'gdpr' })],
      },
      [],
    );
    expect(reports).toHaveLength(2);
    expect(reports[0].framework).toBe('soc2');
    expect(reports[1].framework).toBe('gdpr');
  });

  it('should generate executive summary', () => {
    const reports = [
      generator.generateReport('soc2', controls, []),
      generator.generateReport('gdpr', [makeControl({ controlId: 'Art.5', framework: 'gdpr', status: 'implemented' })], []),
    ];
    const summary = generator.generateExecutiveSummary(reports);
    expect(summary.totalControls).toBeGreaterThan(0);
    expect(summary.frameworkSummaries).toHaveLength(2);
    expect(summary.overallScore).toBeGreaterThanOrEqual(0);
  });

  it('should export report in JSON format', () => {
    const report = generator.generateReport('soc2', controls, []);
    const json = generator.exportReport(report, 'json');
    const parsed = JSON.parse(json);
    expect(parsed.id).toBe(report.id);
    expect(parsed.framework).toBe('soc2');
  });

  it('should export report in CSV format', () => {
    const report = generator.generateReport('soc2', controls, []);
    const csv = generator.exportReport(report, 'csv');
    expect(csv).toContain('Finding ID');
    expect(csv).toContain(report.findings[0].controlId);
  });

  it('should export report in HTML format', () => {
    const report = generator.generateReport('soc2', controls, []);
    const html = generator.exportReport(report, 'html');
    expect(html).toContain('<!DOCTYPE html>');
    expect(html).toContain(report.title);
  });

  it('should compare two reports', () => {
    const baseline = generator.generateReport('soc2', controls, []);
    const currentControls = controls.map((c) =>
      c.controlId === 'CC2' ? { ...c, status: 'implemented' as const } : c
    );
    const current = generator.generateReport('soc2', currentControls, []);
    const comparison = generator.compareReports(baseline, current);
    expect(comparison.scoreDelta).toBeGreaterThan(0);
  });
});

// --- ComplianceDashboard ---

describe('ComplianceDashboard', () => {
  let dashboard: ComplianceDashboard;
  let controls: Control[];

  beforeEach(() => {
    dashboard = new ComplianceDashboard();
    controls = [
      makeControl({ controlId: 'CC1', status: 'implemented', framework: 'soc2' }),
      makeControl({ controlId: 'CC2', status: 'not-implemented', framework: 'soc2' }),
      makeControl({ controlId: 'Art.5', status: 'implemented', framework: 'gdpr' }),
    ];
  });

  it('should build a complete dashboard', () => {
    const score = { overall: 65, byFramework: { soc2: 50, gdpr: 100 }, byDimension: { controls: 65, evidence: 70, testing: 60, documentation: 50 }, lastUpdated: '2026-07-01T00:00:00Z', trend: 'stable' as const };
    const data = dashboard.buildDashboard(controls, [], score, [], []);
    expect(data.overallScore).toBe(65);
    expect(data.frameworks).toHaveLength(6);
    expect(data.activeFindings).toBe(1);
  });

  it('should get framework breakdown', () => {
    const breakdown = dashboard.getFrameworkBreakdown(controls, 'soc2');
    expect(breakdown.framework).toBe('soc2');
    expect(breakdown.score).toBe(50);
    expect(breakdown.passingCount).toBe(1);
    expect(breakdown.failingCount).toBe(1);
  });

  it('should calculate trend from score history', () => {
    const scores = [
      { overall: 40, byFramework: {}, byDimension: { controls: 0, evidence: 0, testing: 0, documentation: 0 }, lastUpdated: '', trend: 'improving' as const },
      { overall: 60, byFramework: {}, byDimension: { controls: 0, evidence: 0, testing: 0, documentation: 0 }, lastUpdated: '', trend: 'improving' as const },
      { overall: 80, byFramework: {}, byDimension: { controls: 0, evidence: 0, testing: 0, documentation: 0 }, lastUpdated: '', trend: 'improving' as const },
    ];
    const trend = dashboard.calculateTrend(scores);
    expect(trend.direction).toBe('improving');
    expect(trend.delta).toBe(40);
  });

  it('should identify highest risk areas', () => {
    const areas = dashboard.getHighestRiskAreas(controls);
    expect(areas.length).toBeGreaterThan(0);
    expect(areas[0].score).toBeLessThanOrEqual(100);
  });

  it('should get compliance timeline', () => {
    const events = [
      { id: '1', title: 'SOC2 Audit', type: 'audit' as const, dueDate: '2026-12-01', assignee: 'ciso', framework: 'soc2' as const, completed: false },
      { id: '2', title: 'Access Review', type: 'review' as const, dueDate: '2026-08-01', assignee: 'security', framework: 'soc2' as const, completed: false },
    ];
    const timeline = dashboard.getComplianceTimeline(events);
    expect(timeline).toHaveLength(2);
    expect(timeline[0].date).toBe('2026-08-01');
  });

  it('should get status distribution', () => {
    const dist = dashboard.getStatusDistribution(controls);
    expect(dist['implemented']).toBe(2);
    expect(dist['not-implemented']).toBe(1);
  });
});

// --- ControlMapper ---

describe('ControlMapper', () => {
  let mapper: ControlMapper;

  beforeEach(() => {
    mapper = new ControlMapper();
  });

  it('should create a control map', () => {
    const controls = [makeControl({ controlId: 'CC6.1' })];
    const reqs = [makeRequirement({ requirementId: 'CC6.1' })];
    const map = mapper.createMap('soc2', controls, reqs);
    expect(map.id).toBeDefined();
    expect(map.framework).toBe('soc2');
    expect(map.mappings.length).toBeGreaterThan(0);
  });

  it('should create a map with custom mappings', () => {
    const controls = [makeControl({ controlId: 'CC6.1' })];
    const reqs = [makeRequirement({ requirementId: 'CC6.1', framework: 'gdpr' })];
    const map = mapper.createMap('soc2', controls, reqs, [
      { sourceControlId: 'CC6.1', targetRequirementId: 'CC6.1', coverage: 'full' },
    ]);
    expect(map.mappings).toHaveLength(1);
    expect(map.mappings[0].coverage).toBe('full');
  });

  it('should retrieve maps by framework', () => {
    const controls = [makeControl({ controlId: 'CC6.1' })];
    const reqs = [makeRequirement({ requirementId: 'CC6.1' })];
    mapper.createMap('soc2', controls, reqs);
    mapper.createMap('gdpr', [], []);
    const soc2Maps = mapper.getMapsByFramework('soc2');
    expect(soc2Maps).toHaveLength(1);
  });

  it('should find cross-framework mappings', () => {
    const controls = [makeControl({ controlId: 'CC6.1' })];
    const reqs = [makeRequirement({ requirementId: 'CC6.1', framework: 'gdpr' })];
    mapper.createMap('soc2', controls, reqs, [
      { sourceControlId: 'CC6.1', targetRequirementId: 'CC6.1', coverage: 'full' },
    ]);
    const cross = mapper.findCrossFrameworkMappings('soc2', 'gdpr');
    expect(cross).toHaveLength(1);
  });

  it('should analyze coverage', () => {
    const controls = [makeControl({ controlId: 'CC6.1' })];
    const reqs = [makeRequirement({ requirementId: 'CC6.1' })];
    mapper.createMap('soc2', controls, reqs, [
      { sourceControlId: 'CC6.1', targetRequirementId: 'CC6.1', coverage: 'full' },
    ]);
    const analysis = mapper.analyzeCoverage(controls, reqs);
    expect(analysis.total).toBe(1);
    expect(analysis.mapped).toBe(1);
  });

  it('should generate mapping report', () => {
    const controls = [makeControl({ controlId: 'CC6.1' })];
    const reqs = [makeRequirement({ requirementId: 'CC6.1' })];
    const map = mapper.createMap('soc2', controls, reqs, [
      { sourceControlId: 'CC6.1', targetRequirementId: 'CC6.1', coverage: 'full' },
    ]);
    const report = mapper.generateMappingReport(map);
    expect(report).toContain('CONTROL MAPPING REPORT');
    expect(report).toContain('CC6.1');
  });
});

// --- RemediationPlanner ---

describe('RemediationPlanner', () => {
  let planner: RemediationPlanner;
  let controls: Control[];
  let findings: any[];

  beforeEach(() => {
    planner = new RemediationPlanner();
    controls = [
      makeControl({ controlId: 'CC1', status: 'not-implemented', severity: 'critical' }),
      makeControl({ controlId: 'CC2', status: 'partial', severity: 'high' }),
    ];
    findings = [];
  });

  it('should create a remediation plan', () => {
    const plan = planner.createPlan('soc2', controls, findings, 'SOC2 Remediation');
    expect(plan.id).toBeDefined();
    expect(plan.framework).toBe('soc2');
    expect(plan.title).toBe('SOC2 Remediation');
    expect(plan.items.length).toBeGreaterThan(0);
    expect(plan.totalEffortHours).toBeGreaterThan(0);
  });

  it('should retrieve plans by framework', () => {
    planner.createPlan('soc2', controls, findings);
    planner.createPlan('gdpr', [], []);
    const soc2Plans = planner.getPlansByFramework('soc2');
    expect(soc2Plans).toHaveLength(1);
  });

  it('should update plan status', () => {
    const plan = planner.createPlan('soc2', controls, findings);
    const result = planner.updatePlanStatus(plan.id, 'active');
    expect(result).toBe(true);
    const updated = planner.getPlan(plan.id);
    expect(updated!.status).toBe('active');
  });

  it('should update remediation status', () => {
    const plan = planner.createPlan('soc2', controls, findings);
    const itemId = plan.items[0].id;
    const result = planner.updateRemediationStatus(plan.id, itemId, 'resolved');
    expect(result).toBe(true);
    const updated = planner.getPlan(plan.id);
    expect(updated!.completedItems).toBe(1);
  });

  it('should calculate progress', () => {
    const plan = planner.createPlan('soc2', controls, findings);
    const progress = planner.getProgress(plan.id);
    expect(progress.total).toBeGreaterThan(0);
    expect(progress.percent).toBe(0);
  });

  it('should suggest remediations', () => {
    const suggestions = planner.suggestRemediations(controls);
    expect(suggestions.length).toBeGreaterThan(0);
    expect(suggestions[0].priority).toBeDefined();
    expect(suggestions[0].effortHours).toBeGreaterThan(0);
  });

  it('should generate plan report', () => {
    const plan = planner.createPlan('soc2', controls, findings);
    const report = planner.generateReport(plan.id);
    expect(report).toContain('REMEDIATION PLAN REPORT');
    expect(report).toContain(plan.framework);
  });

  it('should get active plans', () => {
    const plan = planner.createPlan('soc2', controls, findings);
    planner.updatePlanStatus(plan.id, 'active');
    const active = planner.getActivePlans();
    expect(active).toHaveLength(1);
  });
});

// --- ContinuousComplianceMonitor ---

describe('ContinuousComplianceMonitor', () => {
  let monitor: ContinuousComplianceMonitor;

  beforeEach(() => {
    monitor = new ContinuousComplianceMonitor({ intervalMs: 60000 });
  });

  it('should add controls to monitoring', () => {
    monitor.addControl(makeControl({ controlId: 'CC1' }));
    expect(monitor.monitoredCount).toBe(1);
  });

  it('should add multiple controls', () => {
    monitor.addControls([
      makeControl({ controlId: 'CC1' }),
      makeControl({ controlId: 'CC2' }),
    ]);
    expect(monitor.monitoredCount).toBe(2);
  });

  it('should remove controls from monitoring', () => {
    monitor.addControl(makeControl({ controlId: 'CC1' }));
    const result = monitor.removeControl('soc2', 'CC1');
    expect(result).toBe(true);
    expect(monitor.monitoredCount).toBe(0);
  });

  it('should start and stop monitoring', () => {
    monitor.start();
    monitor.stop();
    expect(monitor.monitoredCount).toBe(0);
  });

  it('should run a compliance check', async () => {
    monitor.addControl(makeControl({ controlId: 'CC1', status: 'implemented' }));
    monitor.addControl(makeControl({ controlId: 'CC2', status: 'implemented' }));
    const summary = await monitor.runCheck();
    expect(summary.totalControls).toBe(2);
    expect(summary.passed + summary.failed).toBe(2);
    expect(summary.durationMs).toBeGreaterThanOrEqual(0);
  });

  it('should detect drifts', async () => {
    monitor.addControl(makeControl({ controlId: 'CC1', status: 'implemented' }));
    await monitor.runCheck();
    const drifts = monitor.getDrifts();
    expect(Array.isArray(drifts)).toBe(true);
  });

  it('should filter drifts by framework', async () => {
    monitor.addControl(makeControl({ controlId: 'CC1', status: 'implemented' }));
    await monitor.runCheck();
    const soc2Drifts = monitor.getDrifts('soc2');
    expect(Array.isArray(soc2Drifts)).toBe(true);
  });

  it('should acknowledge a drift', async () => {
    monitor.addControl(makeControl({ controlId: 'CC1', status: 'implemented' }));
    await monitor.runCheck();
    const drifts = monitor.getDrifts();
    if (drifts.length > 0) {
      const result = monitor.acknowledgeDrift(drifts[0].id, 'auditor');
      expect(result).toBe(true);
      expect(drifts[0].acknowledged).toBe(true);
      expect(drifts[0].acknowledgedBy).toBe('auditor');
    }
  });

  it('should get monitor health', () => {
    monitor.addControl(makeControl({ controlId: 'CC1' }));
    const health = monitor.getMonitorHealth();
    expect(health.monitoredCount).toBe(1);
    expect(['healthy', 'degraded', 'failing', 'unknown']).toContain(health.status);
  });

  it('should get evidence freshness report', () => {
    const evidence = [
      makeEvidence({ id: 'ev1', timestamp: new Date().toISOString() }),
      makeEvidence({ id: 'ev2', timestamp: '2025-01-01T00:00:00Z' }),
    ];
    const report = monitor.getEvidenceFreshnessReport(evidence);
    expect(report).toHaveLength(2);
    expect(report[0].fresh).toBe(true);
    expect(report[1].fresh).toBe(false);
  });

  it('should deduplicate control addition', () => {
    monitor.addControl(makeControl({ controlId: 'CC1' }));
    monitor.addControl(makeControl({ controlId: 'CC1' }));
    expect(monitor.monitoredCount).toBe(1);
  });
});
