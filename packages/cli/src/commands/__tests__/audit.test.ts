import { Command } from 'commander';
import { auditCommand, runAudit } from '../audit';

jest.mock('@ideia/audit-trail', () => ({
  AuditTrail: jest.fn(),
  PendenciaStore: jest.fn(),
}));

import { AuditTrail, PendenciaStore } from '@ideia/audit-trail';

const mockAuditTrail = () => ({
  verifyChain: jest.fn().mockReturnValue({ valid: true }),
  count: jest.fn().mockReturnValue(5),
});

const mockPendenciaStore = (overrides = {}) => ({
  count: jest.fn().mockReturnValue({ open: 0, bySeverity: { critical: 0, high: 0, medium: 0, low: 0 } }),
  ...overrides,
});

beforeEach(() => {
  jest.clearAllMocks();
  jest.spyOn(process, 'exit').mockImplementation((() => {}) as () => never);
  jest.spyOn(console, 'log').mockImplementation(() => {});
  jest.spyOn(console, 'error').mockImplementation(() => {});
  (AuditTrail as jest.Mock).mockImplementation(() => mockAuditTrail());
  (PendenciaStore as jest.Mock).mockImplementation(() => mockPendenciaStore());
});

describe('auditCommand', () => {
  it('should be defined', () => {
    expect(auditCommand).toBeDefined();
  });

  it('should return a Command with name audit', () => {
    const cmd = auditCommand();
    expect(cmd.name()).toBe('audit');
  });

  it('should have description containing Auditoria', () => {
    const cmd = auditCommand();
    expect(cmd.description()).toContain('Auditoria');
  });

  it('should have --json option', () => {
    const cmd = auditCommand();
    const opt = cmd.options.find(o => o.long === '--json');
    expect(opt).toBeDefined();
  });

  it('should have --dry-run option', () => {
    const cmd = auditCommand();
    const opt = cmd.options.find(o => o.long === '--dry-run');
    expect(opt).toBeDefined();
  });

  it('should be a top-level command (no parent name required)', () => {
    const cmd = auditCommand();
    expect(cmd).toBeInstanceOf(Command);
  });
});

describe('runAudit', () => {
  it('should return findings and allChecksPassed', () => {
    const result = runAudit({ cwd: '/test' });
    expect(result).toHaveProperty('findings');
    expect(result).toHaveProperty('allChecksPassed');
    expect(Array.isArray(result.findings)).toBe(true);
  });

  it('should pass when audit chain is valid and no pendencias', () => {
    const result = runAudit({ cwd: '/test' });
    expect(result.allChecksPassed).toBe(true);
  });

  it('should fail when audit chain is broken', () => {
    (AuditTrail as jest.Mock).mockImplementation(() => ({
      verifyChain: jest.fn().mockReturnValue({ valid: false, breakAtIndex: 3, breakReason: 'hash mismatch' }),
      count: jest.fn().mockReturnValue(5),
    }));
    const result = runAudit({ cwd: '/test' });
    expect(result.allChecksPassed).toBe(false);
    const chainFindings = result.findings.filter(f => f.id === 'AUDIT-CHAIN-BROKEN');
    expect(chainFindings.length).toBeGreaterThan(0);
    expect(chainFindings[0].severity).toBe('critical');
  });

  it('should warn when audit trail is empty', () => {
    (AuditTrail as jest.Mock).mockImplementation(() => ({
      verifyChain: jest.fn().mockReturnValue({ valid: true }),
      count: jest.fn().mockReturnValue(0),
    }));
    const result = runAudit({ cwd: '/test' });
    const emptyFindings = result.findings.filter(f => f.id === 'AUDIT-TRAIL-EMPTY');
    expect(emptyFindings.length).toBeGreaterThan(0);
    expect(emptyFindings[0].severity).toBe('medium');
  });

  it('should report open pendencias', () => {
    (PendenciaStore as jest.Mock).mockImplementation(() => ({
      count: jest.fn().mockReturnValue({ open: 3, bySeverity: { critical: 1, high: 1, medium: 1, low: 0 } }),
    }));
    const result = runAudit({ cwd: '/test' });
    const pendFindings = result.findings.filter(f => f.id === 'AUDIT-PENDENCIAS-OPEN');
    expect(pendFindings.length).toBeGreaterThan(0);
  });

  it('should mark critical pendencias as critical severity', () => {
    (PendenciaStore as jest.Mock).mockImplementation(() => ({
      count: jest.fn().mockReturnValue({ open: 1, bySeverity: { critical: 1, high: 0, medium: 0, low: 0 } }),
    }));
    const result = runAudit({ cwd: '/test' });
    const criticalPend = result.findings.find(f => f.id === 'AUDIT-PENDENCIAS-OPEN');
    expect(criticalPend).toBeDefined();
    expect(criticalPend!.severity).toBe('critical');
  });

  it('should have all findings with required fields', () => {
    (AuditTrail as jest.Mock).mockImplementation(() => ({
      verifyChain: jest.fn().mockReturnValue({ valid: false, breakAtIndex: 1, breakReason: 'test' }),
      count: jest.fn().mockReturnValue(0),
    }));
    const result = runAudit({ cwd: '/test' });
    for (const finding of result.findings) {
      expect(finding).toHaveProperty('id');
      expect(finding).toHaveProperty('severity');
      expect(finding).toHaveProperty('category');
      expect(finding).toHaveProperty('title');
      expect(finding).toHaveProperty('description');
      expect(finding).toHaveProperty('recommendation');
      expect(['low', 'medium', 'high', 'critical']).toContain(finding.severity);
    }
  });

  it('should use default cwd when not provided', () => {
    (AuditTrail as jest.Mock).mockImplementation(() => ({
      verifyChain: jest.fn().mockReturnValue({ valid: true }),
      count: jest.fn().mockReturnValue(5),
    }));
    const result = runAudit();
    expect(AuditTrail).toHaveBeenCalled();
    expect(result).toBeDefined();
  });
});

describe('auditCommand action', () => {
  it('should execute with --json flag', () => {
    const cmd = auditCommand();
    const logSpy = jest.spyOn(console, 'log');
    cmd.parse(['node', 'test', '--json']);
    expect(logSpy).toHaveBeenCalled();
    expect(AuditTrail).toHaveBeenCalled();
    expect(PendenciaStore).toHaveBeenCalled();
  });

  it('should execute with --dry-run flag', () => {
    const cmd = auditCommand();
    const logSpy = jest.spyOn(console, 'log');
    cmd.parse(['node', 'test', '--dry-run']);
    expect(logSpy).toHaveBeenCalled();
  });
});

describe('findings structure', () => {
  it('should categorize findings correctly', () => {
    (AuditTrail as jest.Mock).mockImplementation(() => ({
      verifyChain: jest.fn().mockReturnValue({ valid: false, breakAtIndex: 0, breakReason: 'tampered' }),
      count: jest.fn().mockReturnValue(0),
    }));
    const result = runAudit({ cwd: '/test' });
    const securityFindings = result.findings.filter(f => f.category === 'security');
    const qualityFindings = result.findings.filter(f => f.category === 'quality');
    expect(securityFindings.length).toBeGreaterThan(0);
    expect(qualityFindings.length).toBeGreaterThan(0);
  });

  it('should have no findings when everything is clean', () => {
    (PendenciaStore as jest.Mock).mockImplementation(() => ({
      count: jest.fn().mockReturnValue({ open: 0, bySeverity: { critical: 0, high: 0, medium: 0, low: 0 } }),
    }));
    const result = runAudit({ cwd: '/test' });
    expect(result.findings.length).toBe(0);
    expect(result.allChecksPassed).toBe(true);
  });
});
