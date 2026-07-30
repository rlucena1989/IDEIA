import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';

const mockHandleCoverageAudit = jest.fn();
const mockHandleCoverageGaps = jest.fn();
const mockHandleCoverageRepair = jest.fn();
const mockHandleCoverageStatus = jest.fn();

jest.mock('../../domain/coverage-service', () => ({
  handleCoverageAudit: (...args: unknown[]) => mockHandleCoverageAudit(...args),
  handleCoverageGaps: (...args: unknown[]) => mockHandleCoverageGaps(...args),
  handleCoverageRepair: (...args: unknown[]) => mockHandleCoverageRepair(...args),
  handleCoverageStatus: (...args: unknown[]) => mockHandleCoverageStatus(...args),
}));

function getCmd() {
  const { coverageCommand } = require('../coverage');
  return coverageCommand();
}

describe('coverageCommand', () => {
  let logSpy: jest.SpiedFunction<typeof console.log>;

  beforeEach(() => {
    jest.clearAllMocks();
    logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    mockHandleCoverageAudit.mockReturnValue({ ok: true, message: 'OK', data: { overall: { lines: 50, branches: 40, functions: 60, statements: 55 }, average: 51, gaps: [], fileCount: 10 } });
    mockHandleCoverageGaps.mockReturnValue({ ok: true, message: 'OK', data: { gaps: [], ranked: {}, total: 0 } });
    mockHandleCoverageRepair.mockReturnValue({ ok: true, message: 'OK', data: { repaired: ['gap-1'], status: { gapsFound: 1, currentFocus: 'test', nextAction: 'fix', blocked: false }, coverage: 60 } });
    mockHandleCoverageStatus.mockReturnValue({ ok: true, message: 'OK', data: { current: 51, gaps: 5, target: 80, persisted: null } });
  });

  afterEach(() => { logSpy.mockRestore(); });

  it('returns command named coverage', () => { expect(getCmd().name()).toBe('coverage'); });

  it('has subcommands audit, gaps, repair, status', () => {
    const names = getCmd().commands.map((c: { name: () => string }) => c.name());
    expect(names).toEqual(['audit', 'gaps', 'repair', 'status']);
  });

  it('audit subcommand prints coverage overview', () => {
    const cmd = getCmd();
    const audit = cmd.commands.find((c: { name: () => string }) => c.name() === 'audit')!;
    audit._actionHandler([]);
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('Cobertura geral: 51%'));
  });

  it('audit subcommand shows warning when not ok', () => {
    mockHandleCoverageAudit.mockReturnValue({ ok: false, message: 'Error fetching data' });
    const cmd = getCmd();
    const audit = cmd.commands.find((c: { name: () => string }) => c.name() === 'audit')!;
    audit._actionHandler([]);
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('Error fetching data'));
  });

  it('audit subcommand outputs JSON with --json flag', () => {
    const cmd = getCmd();
    const audit = cmd.commands.find((c: { name: () => string }) => c.name() === 'audit')!;
    audit.setOptionValue('json', true);
    audit._actionHandler([]);
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('"overall"'));
  });

  it('audit subcommand prints ranked gaps when present', () => {
    mockHandleCoverageAudit.mockReturnValue({ ok: true, message: 'OK', data: { overall: { lines: 30, branches: 20, functions: 25, statements: 28 }, average: 26, fileCount: 5, gaps: [{ severity: 'critical', file: 'src/a.ts', reason: 'No tests' }, { severity: 'important', file: 'src/b.ts', reason: 'Low coverage' }] } });
    const cmd = getCmd();
    const audit = cmd.commands.find((c: { name: () => string }) => c.name() === 'audit')!;
    audit._actionHandler([]);
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('CRITICAL'));
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('IMPORTANT'));
  });

  it('gaps subcommand shows none found message when empty', () => {
    const cmd = getCmd();
    const gaps = cmd.commands.find((c: { name: () => string }) => c.name() === 'gaps')!;
    gaps._actionHandler([]);
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('Nenhum gap encontrado'));
  });

  it('gaps subcommand lists prioritized gaps', () => {
    mockHandleCoverageGaps.mockReturnValue({ ok: true, message: 'OK', data: { gaps: [{ severity: 'critical', file: 'src/x.ts', reason: 'No coverage', recommendation: 'Add tests' }], total: 1 } });
    const cmd = getCmd();
    const gaps = cmd.commands.find((c: { name: () => string }) => c.name() === 'gaps')!;
    gaps._actionHandler([]);
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('Gaps priorizados'));
  });

  it('gaps subcommand outputs JSON with --json flag', () => {
    const cmd = getCmd();
    const gaps = cmd.commands.find((c: { name: () => string }) => c.name() === 'gaps')!;
    gaps.setOptionValue('json', true);
    gaps._actionHandler([]);
    expect(logSpy).toHaveBeenCalledWith('[]');
  });

  it('gaps subcommand filters by severity', () => {
    const cmd = getCmd();
    const gaps = cmd.commands.find((c: { name: () => string }) => c.name() === 'gaps')!;
    gaps.setOptionValue('severity', 'critical');
    gaps._actionHandler([]);
    expect(mockHandleCoverageGaps).toHaveBeenCalledWith('critical');
  });

  it('gaps subcommand handles error result', () => {
    mockHandleCoverageGaps.mockReturnValue({ ok: false, message: 'Service unavailable' });
    const cmd = getCmd();
    const gaps = cmd.commands.find((c: { name: () => string }) => c.name() === 'gaps')!;
    gaps._actionHandler([]);
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('Service unavailable'));
  });

  it('repair subcommand executes repair cycle', () => {
    const cmd = getCmd();
    const repair = cmd.commands.find((c: { name: () => string }) => c.name() === 'repair')!;
    repair.setOptionValue('max', '5');
    repair._actionHandler([]);
    expect(mockHandleCoverageRepair).toHaveBeenCalledWith(5);
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('Ciclo de reparo concluído'));
  });

  it('repair subcommand uses default max of 3', () => {
    const cmd = getCmd();
    const repair = cmd.commands.find((c: { name: () => string }) => c.name() === 'repair')!;
    repair._actionHandler([]);
    expect(mockHandleCoverageRepair).toHaveBeenCalledWith(3);
  });

  it('repair subcommand outputs JSON with --json flag', () => {
    const cmd = getCmd();
    const repair = cmd.commands.find((c: { name: () => string }) => c.name() === 'repair')!;
    repair.setOptionValue('json', true);
    repair._actionHandler([]);
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('"repaired"'));
  });

  it('repair subcommand handles error result', () => {
    mockHandleCoverageRepair.mockReturnValue({ ok: false, message: 'Repair failed' });
    const cmd = getCmd();
    const repair = cmd.commands.find((c: { name: () => string }) => c.name() === 'repair')!;
    repair._actionHandler([]);
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('Repair failed'));
  });

  it('status subcommand shows current coverage stats', () => {
    const cmd = getCmd();
    const status = cmd.commands.find((c: { name: () => string }) => c.name() === 'status')!;
    status._actionHandler([]);
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('Status da Autonomia de Testes'));
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('80%'));
  });

  it('status subcommand shows persisted data when available', () => {
    mockHandleCoverageStatus.mockReturnValue({ ok: true, message: 'OK', data: { current: 60, gaps: 3, target: 80, persisted: { lastRunAt: '2024-01-01', gapsResolved: 5, currentFocus: 'auth', nextAction: 'write tests', blocked: false } } });
    const cmd = getCmd();
    const status = cmd.commands.find((c: { name: () => string }) => c.name() === 'status')!;
    status._actionHandler([]);
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('Último ciclo'));
  });

  it('status subcommand outputs JSON with --json flag', () => {
    const cmd = getCmd();
    const status = cmd.commands.find((c: { name: () => string }) => c.name() === 'status')!;
    status.setOptionValue('json', true);
    status._actionHandler([]);
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('"current"'));
  });
});
