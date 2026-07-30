import { complianceCommand } from '../src/commands';

jest.mock('@ideia/compliance', () => {
  const mockComplianceFramework = { SOC2: 'SOC2', LGPD: 'LGPD' };
  return {
    ComplianceFramework: mockComplianceFramework,
    ComplianceControlRegistry: jest.fn().mockImplementation(() => ({
      statistics: jest.fn().mockReturnValue({ total: 10, implemented: 8, partial: 1, missing: 1 }),
      listControls: jest.fn().mockReturnValue([]),
    })),
    createDefaultRegistry: jest.fn().mockImplementation(() => ({
      statistics: jest.fn().mockReturnValue({ total: 10, implemented: 8, partial: 1, missing: 1 }),
      listControls: jest.fn().mockReturnValue([]),
    })),
    EvidenceCollector: jest.fn().mockImplementation(() => ({
      getEvidence: jest.fn().mockReturnValue([{ id: 'ev-001', type: 'document', controlId: 'SOC2-01', timestamp: new Date() }]),
      listAll: jest.fn().mockReturnValue([{ id: 'ev-001', type: 'document', controlId: 'SOC2-01', timestamp: new Date() }]),
    })),
    ComplianceScoreCalculator: jest.fn().mockImplementation(() => ({
      calculate: jest.fn().mockReturnValue({ framework: 'SOC2', score: 80, level: 'B', implemented: 8, partial: 1, missing: 1, total: 10 }),
    })),
  };
});

describe('complianceCommand', () => {
  test('returns a Command instance', () => {
    const cmd = complianceCommand();
    expect(cmd.name()).toBe('compliance');
  });

  test('command has expected subcommands', () => {
    const cmd = complianceCommand();
    const subcommands = cmd.commands.map(c => c.name());
    expect(subcommands).toContain('check');
    expect(subcommands).toContain('report');
    expect(subcommands).toContain('evidence');
    expect(subcommands).toContain('score');
  });

  test('check command description is set', () => {
    const cmd = complianceCommand();
    const checkCmd = cmd.commands.find(c => c.name() === 'check');
    expect(checkCmd).toBeDefined();
    expect(checkCmd!.description()).toContain('compliance check');
  });

  test('report command has --standard option', () => {
    const cmd = complianceCommand();
    const reportCmd = cmd.commands.find(c => c.name() === 'report');
    expect(reportCmd).toBeDefined();
    const opts = reportCmd!.options.map(o => o.long);
    expect(opts).toContain('--standard');
    expect(opts).toContain('--period');
  });

  test('evidence command has --control option', () => {
    const cmd = complianceCommand();
    const evidenceCmd = cmd.commands.find(c => c.name() === 'evidence');
    expect(evidenceCmd).toBeDefined();
    const opts = evidenceCmd!.options.map(o => o.long);
    expect(opts).toContain('--control');
  });

  test('score command has --standard option', () => {
    const cmd = complianceCommand();
    const scoreCmd = cmd.commands.find(c => c.name() === 'score');
    expect(scoreCmd).toBeDefined();
    const opts = scoreCmd!.options.map(o => o.long);
    expect(opts).toContain('--standard');
  });

  test('all subcommands have --json option', () => {
    const cmd = complianceCommand();
    for (const sub of cmd.commands) {
      const opts = sub.options.map(o => o.long);
      expect(opts).toContain('--json');
    }
  });
});
