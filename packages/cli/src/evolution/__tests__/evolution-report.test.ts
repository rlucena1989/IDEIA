import { buildEvolutionReport } from '../evolution-report';
import type { StateDelta } from '../delta-types';
import type { EvolutionDecision } from '../decision-types';
import type { EvolutionRunResult } from '../execution-types';
import type { RevalidationResult } from '../revalidation-service';
import type { EvolutionAuditTrail } from '../audit-types';

const baseDelta: StateDelta = {
  generatedAt: new Date().toISOString(),
  fromVersion: 'v1',
  toVersion: 'v2',
  changes: [],
  summary: { added: 1, removed: 0, changed: 2, critical: 0, unchanged: 10 },
};

const baseDecision: EvolutionDecision = {
  action: 'generate',
  rationale: 'Needed',
  risk: 'low',
  confidence: 0.9,
  requiresApproval: false,
};

const baseExecution: EvolutionRunResult = {
  ok: true,
  action: 'generate',
  rationale: 'OK',
  deltaSummary: {},
  validation: { passed: true, notes: [] },
  auditId: 'audit-001',
};

const baseRevalidation: RevalidationResult = {
  ok: true,
  beforeScore: 70,
  afterScore: 85,
  delta: 15,
  notes: ['Improved'],
};

const baseAudit: EvolutionAuditTrail = {
  generatedAt: new Date().toISOString(),
  entries: [],
};

describe('buildEvolutionReport', () => {
  it('builds a report with all fields', () => {
    const report = buildEvolutionReport({
      delta: baseDelta,
      decision: baseDecision,
      execution: baseExecution,
      revalidation: baseRevalidation,
      audit: baseAudit,
    });
    expect(report.generatedAt).toBeDefined();
    expect(report.delta).toBe(baseDelta);
    expect(report.decision).toBe(baseDecision);
    expect(report.execution).toBe(baseExecution);
    expect(report.revalidation).toBe(baseRevalidation);
    expect(report.audit).toBe(baseAudit);
  });

  it('generates summary lines', () => {
    const report = buildEvolutionReport({
      delta: baseDelta,
      decision: baseDecision,
      execution: baseExecution,
      revalidation: baseRevalidation,
      audit: baseAudit,
    });
    expect(report.summary.length).toBeGreaterThanOrEqual(4);
    expect(report.summary[0]).toContain('changed');
    expect(report.summary[1]).toContain('risk');
  });

  it('reports blocked execution', () => {
    const blocked: EvolutionRunResult = { ...baseExecution, ok: false, rationale: 'Blocked by policy' };
    const report = buildEvolutionReport({
      delta: baseDelta,
      decision: baseDecision,
      execution: blocked,
      revalidation: baseRevalidation,
      audit: baseAudit,
    });
    expect(report.summary.some(s => s.includes('BLOCKED'))).toBe(true);
  });

  it('reports regression in revalidation', () => {
    const regressed: RevalidationResult = { ...baseRevalidation, ok: false, delta: -10 };
    const report = buildEvolutionReport({
      delta: baseDelta,
      decision: baseDecision,
      execution: baseExecution,
      revalidation: regressed,
      audit: baseAudit,
    });
    expect(report.summary.some(s => s.includes('Regressed'))).toBe(true);
  });
});
