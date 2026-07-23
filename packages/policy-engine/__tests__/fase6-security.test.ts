import { describe, it, expect } from '@jest/globals';
import { evaluatePolicy, evaluateBatch } from '../src/policy';
import { evaluateCedarPolicy as _evaluateCedarPolicy, evaluateCedarPolicySet, defaultCedarPolicies } from '../src/cedar-adapter';
import { auditRegexPolicies, auditCedarPolicies } from '../src/audit-policies';
import { runCompliance } from '../src/compliance';

describe('Fase 6 — Policy Engine (regex)', () => {
  it('should auto-approve low risk actions', () => {
    expect(evaluatePolicy({ actionType: 'code.analyze', riskLevel: 'low' }).decision).toBe('auto');
  });

  it('should block destructive rm -rf', () => {
    expect(evaluatePolicy({ actionType: 'shell.exec', resource: 'rm -rf /', riskLevel: 'high' }).decision).toBe('block');
  });

  it('should block PowerShell Invoke-Expression', () => {
    expect(evaluatePolicy({ actionType: 'shell.exec', resource: 'Invoke-Expression "malicious"', riskLevel: 'high' }).decision).toBe('block');
  });

  it('should ask for approval on file.delete', () => {
    expect(evaluatePolicy({ actionType: 'file.delete', riskLevel: 'medium' }).decision).toBe('ask');
  });

  it('should ask for approval on policy.change', () => {
    expect(evaluatePolicy({ actionType: 'policy.change', riskLevel: 'medium' }).decision).toBe('ask');
  });

  it('should require approval for shell exec even with low risk', () => {
    expect(evaluatePolicy({ actionType: 'shell.exec', resource: 'npm install express', riskLevel: 'low' }).decision).toBe('ask');
  });

  it('should block disk format', () => {
    expect(evaluatePolicy({ actionType: 'shell.exec', resource: 'format C: /FS:NTFS', riskLevel: 'high' }).decision).toBe('block');
  });

  it('should evaluate batch correctly', () => {
    const results = evaluateBatch([
      { actionType: 'file.read', riskLevel: 'low' },
      { actionType: 'file.delete', riskLevel: 'medium' },
      { actionType: 'shell.exec', resource: 'rm -rf /', riskLevel: 'high' },
    ]);
    expect(results).toHaveLength(3);
    expect(results[0].decision).toBe('auto');
    expect(results[1].decision).toBe('ask');
    expect(results[2].decision).toBe('block');
  });
});

describe('Fase 6 — Cedar Adapter', () => {
  const policySet = defaultCedarPolicies();

  it('should permit low-risk file read', () => {
    const result = evaluateCedarPolicySet(policySet, { actionType: 'file.read', resource: 'test.txt', riskLevel: 'low' });
    expect(result.decision).toBe('auto');
  });

  it('should block destructive shell', () => {
    const result = evaluateCedarPolicySet(policySet, { actionType: 'shell.exec', resource: 'rm -rf /', riskLevel: 'high' });
    expect(result.decision).toBe('block');
  });

  it('should block PowerShell IEX', () => {
    const result = evaluateCedarPolicySet(policySet, { actionType: 'shell.exec', resource: 'Invoke-Expression "test"', riskLevel: 'high' });
    expect(result.decision).toBe('block');
  });

  it('should block production deploy', () => {
    const result = evaluateCedarPolicySet(policySet, { actionType: 'deploy', resource: 'production', riskLevel: 'high' });
    expect(result.decision).toBe('block');
  });

  it('should permit npm install', () => {
    const result = evaluateCedarPolicySet(policySet, { actionType: 'shell.exec', resource: 'npm install express', riskLevel: 'low' });
    expect(result.decision).toBe('auto');
  });

  it('should detect fork bombs', () => {
    const result = evaluateCedarPolicySet(policySet, { actionType: 'shell.exec', resource: ':(){ :|:& };:', riskLevel: 'high' });
    expect(result.decision).toBe('block');
  });
});

describe('Fase 6 — Policy Audit', () => {
  it('should run regex policy audit', () => {
    const report = auditRegexPolicies();
    expect(report.totalRules).toBeGreaterThan(0);
    expect(report.passed + report.failed).toBe(report.totalRules);
    expect(report.coverage.actionTypes).toContain('file.read');
    expect(report.coverage.riskLevels).toContain('low');
  });

  it('should run Cedar policy audit', () => {
    const report = auditCedarPolicies(defaultCedarPolicies());
    expect(report.totalRules).toBe(5);
    expect(report.coverage.actionTypes).toContain('file.read');
  });
});

describe('Fase 6 — Compliance', () => {
  it('should run LGPD compliance checks', () => {
    const reports = runCompliance(['lgpd']);
    expect(reports).toHaveLength(1);
    expect(reports[0].framework).toBe('lgpd');
    expect(reports[0].checks.length).toBeGreaterThan(0);
  });

  it('should run all compliance frameworks', () => {
    const reports = runCompliance();
    expect(reports).toHaveLength(4);
    const frameworks = reports.map(r => r.framework);
    expect(frameworks).toContain('lgpd');
    expect(frameworks).toContain('hipaa');
    expect(frameworks).toContain('gdpr');
    expect(frameworks).toContain('soc2');
  });

  it('should compute scores correctly', () => {
    const reports = runCompliance();
    for (const report of reports) {
      expect(report.score).toBeGreaterThanOrEqual(0);
      expect(report.score).toBeLessThanOrEqual(100);
    }
  });
});