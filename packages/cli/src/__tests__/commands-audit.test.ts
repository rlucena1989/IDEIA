import { describe, it, expect, jest } from '@jest/globals';

jest.mock('@ideia/logger', () => ({
  createLogger: jest.fn(() => ({ info: jest.fn(), error: jest.fn(), warn: jest.fn() })),
}));

jest.mock('@ideia/audit-trail', () => ({
  AuditTrail: jest.fn(),
  PendenciaStore: jest.fn(),
}));

describe('auditCommand', () => {
  it('returns a Command object with name audit', () => {
    const { auditCommand } = require('../commands/audit') as { auditCommand: () => { name: () => string; description: () => string; options: Array<{ attributeName: () => string }> } };
    const cmd = auditCommand();
    expect(cmd.name()).toBe('audit');
  });

  it('has description', () => {
    const { auditCommand } = require('../commands/audit') as { auditCommand: () => { name: () => string; description: () => string; options: Array<{ attributeName: () => string }> } };
    const cmd = auditCommand();
    expect(cmd.description()).toBeTruthy();
  });

  it('has --json option', () => {
    const { auditCommand } = require('../commands/audit') as { auditCommand: () => { name: () => string; description: () => string; options: Array<{ attributeName: () => string }> } };
    const cmd = auditCommand();
    const opt = cmd.options.find((o: { attributeName: () => string }) => o.attributeName() === 'json');
    expect(opt).toBeDefined();
  });
});

describe('runAudit', () => {
  function mockTrail(verifyChainResult: { valid: boolean; breakAtIndex?: number; breakReason?: string }, countResult: number) {
    const trail = require('@ideia/audit-trail') as { AuditTrail: jest.Mock; PendenciaStore: jest.Mock };
    trail.AuditTrail.mockImplementation(() => ({
      verifyChain: () => verifyChainResult,
      count: () => countResult,
    }));
    trail.PendenciaStore.mockImplementation(() => ({
      count: () => ({ open: 0, bySeverity: {} }),
    }));
  }

  it('returns allChecksPassed when chain valid and no pendencias', () => {
    mockTrail({ valid: true }, 1);
    const { runAudit } = require('../commands/audit') as { runAudit: (deps?: { cwd?: string }) => { findings: Array<{ id: string; severity: string }>; allChecksPassed: boolean } };
    const result = runAudit({ cwd: '/test' });
    expect(result.allChecksPassed).toBe(true);
    expect(result.findings).toHaveLength(0);
  });

  it('reports broken chain', () => {
    mockTrail({ valid: false, breakAtIndex: 3, breakReason: 'hash mismatch' }, 1);
    const { runAudit } = require('../commands/audit') as { runAudit: (deps?: { cwd?: string }) => { findings: Array<{ id: string; severity: string }>; allChecksPassed: boolean } };
    const result = runAudit({ cwd: '/test' });
    expect(result.findings.some((f: { id: string }) => f.id === 'AUDIT-CHAIN-BROKEN')).toBe(true);
    expect(result.allChecksPassed).toBe(false);
  });

  it('reports empty trail', () => {
    mockTrail({ valid: true }, 0);
    const { runAudit } = require('../commands/audit') as { runAudit: (deps?: { cwd?: string }) => { findings: Array<{ id: string; severity: string }>; allChecksPassed: boolean } };
    const result = runAudit({ cwd: '/test' });
    expect(result.findings.some((f: { id: string }) => f.id === 'AUDIT-TRAIL-EMPTY')).toBe(true);
  });

  it('reports open pendencias with high severity', () => {
    const trail = require('@ideia/audit-trail') as { AuditTrail: jest.Mock; PendenciaStore: jest.Mock };
    trail.AuditTrail.mockImplementation(() => ({
      verifyChain: () => ({ valid: true }),
      count: () => 1,
    }));
    trail.PendenciaStore.mockImplementation(() => ({
      count: () => ({ open: 3, bySeverity: { high: 2, low: 1 } }),
    }));
    const { runAudit } = require('../commands/audit') as { runAudit: (deps?: { cwd?: string }) => { findings: Array<{ id: string; severity: string }>; allChecksPassed: boolean } };
    const result = runAudit({ cwd: '/test' });
    expect(result.findings.some((f: { id: string }) => f.id === 'AUDIT-PENDENCIAS-OPEN')).toBe(true);
  });

  it('reports critical pendencias and fails check', () => {
    const trail = require('@ideia/audit-trail') as { AuditTrail: jest.Mock; PendenciaStore: jest.Mock };
    trail.AuditTrail.mockImplementation(() => ({
      verifyChain: () => ({ valid: true }),
      count: () => 1,
    }));
    trail.PendenciaStore.mockImplementation(() => ({
      count: () => ({ open: 1, bySeverity: { critical: 1 } }),
    }));
    const { runAudit } = require('../commands/audit') as { runAudit: (deps?: { cwd?: string }) => { findings: Array<{ id: string; severity: string }>; allChecksPassed: boolean } };
    const result = runAudit({ cwd: '/test' });
    const finding = result.findings.find((f: { id: string }) => f.id === 'AUDIT-PENDENCIAS-OPEN');
    expect(finding?.severity).toBe('critical');
    expect(result.allChecksPassed).toBe(false);
  });
});
