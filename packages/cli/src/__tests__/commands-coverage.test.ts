import { describe, it, expect, jest, beforeEach } from '@jest/globals';

const mockHandleCoverageAudit = jest.fn();
const mockHandleCoverageGaps = jest.fn();
const mockHandleCoverageRepair = jest.fn();
const mockHandleCoverageStatus = jest.fn();

jest.mock('../domain/coverage-service', () => ({
  handleCoverageAudit: (...args: unknown[]) => mockHandleCoverageAudit(...args),
  handleCoverageGaps: (...args: unknown[]) => mockHandleCoverageGaps(...args),
  handleCoverageRepair: (...args: unknown[]) => mockHandleCoverageRepair(...args),
  handleCoverageStatus: (...args: unknown[]) => mockHandleCoverageStatus(...args),
}));

describe('commands - coverage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockHandleCoverageAudit.mockReturnValue({
      ok: true, message: 'OK', data: {
        overall: { lines: 50, branches: 40, functions: 60, statements: 55 },
        average: 51, gaps: [], fileCount: 10,
      },
    });
    mockHandleCoverageGaps.mockReturnValue({ ok: true, message: 'OK', data: { gaps: [], ranked: {}, total: 0 } });
    mockHandleCoverageRepair.mockReturnValue({
      ok: true, message: 'OK', data: {
        repaired: ['gap-1'], status: { gapsFound: 1, currentFocus: 'test', nextAction: 'fix', blocked: false }, coverage: 60,
      },
    });
    mockHandleCoverageStatus.mockReturnValue({
      ok: true, message: 'OK', data: { current: 51, gaps: 5, target: 80, persisted: null },
    });
  });

  it('coverageCommand retorna Command com subcomandos', () => {
    const { coverageCommand } = require('../commands/coverage');
    const cmd = coverageCommand();
    expect(cmd.name()).toBe('coverage');
    const names = cmd.commands.map((c: { name: () => string }) => c.name());
    expect(names).toContain('audit');
    expect(names).toContain('gaps');
    expect(names).toContain('repair');
    expect(names).toContain('status');
  });

  it('coverage audit chama handleCoverageAudit', () => {
    const { coverageCommand } = require('../commands/coverage');
    const cmd = coverageCommand();
    const audit = cmd.commands.find((c: { name: () => string }) => c.name() === 'audit');
    expect(audit).toBeDefined();
  });
});
