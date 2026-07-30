import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';

const mockDetectFailures = jest.fn();
const mockResolveFallback = jest.fn();
const mockBuildRecoveryPlan = jest.fn();
const mockExecuteRecovery = jest.fn();
const mockCreateCircuitBreaker = jest.fn();
const mockUpdateCircuitBreaker = jest.fn();
const mockCoordinateRepair = jest.fn();
const mockCreateFailure = jest.fn();
const mockCreateEnvelope = jest.fn();
const mockPrintHeader = jest.fn();
const mockPrintLine = jest.fn();
const mockPrintResult = jest.fn();
const mockGetCliVersion = jest.fn();

jest.mock('../../resilience/failure-detector', () => ({ detectFailures: (...args: unknown[]) => mockDetectFailures(...args) }));
jest.mock('../../resilience/fallback-policy', () => ({ resolveFallback: (...args: unknown[]) => mockResolveFallback(...args) }));
jest.mock('../../resilience/recovery-plan', () => ({ buildRecoveryPlan: (...args: unknown[]) => mockBuildRecoveryPlan(...args) }));
jest.mock('../../resilience/recovery-engine', () => ({ executeRecovery: (...args: unknown[]) => mockExecuteRecovery(...args) }));
jest.mock('../../resilience/circuit-breaker', () => ({ createCircuitBreaker: (...args: unknown[]) => mockCreateCircuitBreaker(...args), updateCircuitBreaker: (...args: unknown[]) => mockUpdateCircuitBreaker(...args) }));
jest.mock('../../resilience/repair-coordinator', () => ({ coordinateRepair: (...args: unknown[]) => mockCoordinateRepair(...args) }));
jest.mock('../../resilience/failure-types', () => ({ createFailure: (...args: unknown[]) => mockCreateFailure(...args) }));
jest.mock('../../hardening/output-contract', () => ({ createEnvelope: (...args: unknown[]) => mockCreateEnvelope(...args) }));
jest.mock('../../utils/output', () => ({ printHeader: (...args: unknown[]) => mockPrintHeader(...args), printLine: (...args: unknown[]) => mockPrintLine(...args), printResult: (...args: unknown[]) => mockPrintResult(...args) }));
jest.mock('../../utils/version', () => ({ getCliVersion: (...args: unknown[]) => mockGetCliVersion(...args) }));

function getCmd() {
  const { recoverCommand } = require('../recover');
  return recoverCommand();
}

describe('recoverCommand', () => {
  let exitSpy: jest.SpiedFunction<typeof process.exit>;

  beforeEach(() => {
    jest.clearAllMocks();
    exitSpy = jest.spyOn(process, 'exit').mockImplementation(() => undefined as never);
    mockGetCliVersion.mockReturnValue('1.0.0');
    mockCreateEnvelope.mockImplementation((data: unknown) => data);
    mockDetectFailures.mockReturnValue({ failures: [], summary: { total: 0, critical: 0 } });
    mockCreateFailure.mockReturnValue({ type: 'integrity', source: 'system', message: 'test', severity: 'high' });
    mockBuildRecoveryPlan.mockReturnValue({ planId: 'plan-1', escalationRequired: false, steps: [{ stepId: 's1', description: 'fix it', required: true }] });
    mockCoordinateRepair.mockReturnValue({ failure: { source: 'svc' }, fallback: { action: 'retry' }, recovery: { ok: true, appliedSteps: ['s1'] }, breaker: { open: false }, summary: 'ok' });
    mockCreateCircuitBreaker.mockReturnValue({ name: 'recovery', failureCount: 0 });
    mockResolveFallback.mockReturnValue({ action: 'fallback' });
    mockExecuteRecovery.mockReturnValue({ ok: true });
    mockUpdateCircuitBreaker.mockReturnValue({ name: 'recovery', failureCount: 1 });
  });

  afterEach(() => { exitSpy.mockRestore(); });

  it('returns command named recover', () => { expect(getCmd().name()).toBe('recover'); });

  it('has subcommands detect, plan, run, report', () => {
    const names = getCmd().commands.map((c: { name: () => string }) => c.name());
    expect(names).toEqual(['detect', 'plan', 'run', 'report']);
  });

  it('detect subcommand shows no failures when empty', () => {
    const cmd = getCmd();
    const detect = cmd.commands.find((c: { name: () => string }) => c.name() === 'detect')!;
    detect._actionHandler(['[]']);
    expect(mockDetectFailures).toHaveBeenCalledWith([]);
    expect(mockPrintLine).toHaveBeenCalledWith(expect.stringContaining('0'));
  });

  it('detect subcommand shows failures with icons', () => {
    mockDetectFailures.mockReturnValue({ failures: [{ type: 'integrity', source: 'db', message: 'corrupt', severity: 'critical' }], summary: { total: 1, critical: 1 } });
    const cmd = getCmd();
    const detect = cmd.commands.find((c: { name: () => string }) => c.name() === 'detect')!;
    detect._actionHandler(['[{"type":"integrity"}]']);
    expect(mockPrintLine).toHaveBeenCalledWith(expect.stringContaining('❌'));
  });

  it('detect subcommand outputs JSON with --json flag', () => {
    const cmd = getCmd();
    const detect = cmd.commands.find((c: { name: () => string }) => c.name() === 'detect')!;
    detect.setOptionValue('json', true);
    detect._actionHandler(['[]']);
    expect(mockPrintLine).toHaveBeenCalledWith(expect.stringContaining('"ok"'));
  });

  it('detect subcommand handles JSON parse error', () => {
    const cmd = getCmd();
    const detect = cmd.commands.find((c: { name: () => string }) => c.name() === 'detect')!;
    detect._actionHandler(['invalid json']);
    expect(exitSpy).toHaveBeenCalledWith(1);
  });

  it('plan subcommand creates failure and plan', () => {
    const cmd = getCmd();
    const plan = cmd.commands.find((c: { name: () => string }) => c.name() === 'plan')!;
    plan.setOptionValue('source', 'db');
    plan.setOptionValue('severity', 'critical');
    plan._actionHandler(['integrity']);
    expect(mockCreateFailure).toHaveBeenCalledWith({ type: 'integrity', source: 'db', message: 'Falha de integrity detectada', severity: 'critical' });
    expect(mockBuildRecoveryPlan).toHaveBeenCalled();
    expect(mockPrintHeader).toHaveBeenCalledWith('Plano de Recuperação');
  });

  it('plan subcommand outputs JSON with --json flag', () => {
    const cmd = getCmd();
    const plan = cmd.commands.find((c: { name: () => string }) => c.name() === 'plan')!;
    plan.setOptionValue('json', true);
    plan._actionHandler(['integrity']);
    expect(mockPrintLine).toHaveBeenCalledWith(expect.stringContaining('"planId"'));
  });

  it('plan subcommand handles errors', () => {
    mockCreateFailure.mockImplementation(() => { throw new Error('fail'); });
    const cmd = getCmd();
    const plan = cmd.commands.find((c: { name: () => string }) => c.name() === 'plan')!;
    plan._actionHandler(['integrity']);
    expect(exitSpy).toHaveBeenCalledWith(1);
  });

  it('run subcommand reports healthy when no failures', () => {
    const cmd = getCmd();
    const run = cmd.commands.find((c: { name: () => string }) => c.name() === 'run')!;
    run._actionHandler(['[]']);
    expect(mockPrintLine).toHaveBeenCalledWith('Nenhuma falha detectada. Sistema saudável.');
  });

  it('run subcommand executes repair for each failure', () => {
    mockDetectFailures.mockReturnValue({ failures: [{ type: 'sync', source: 'svc1', message: 'err', severity: 'high' }], summary: { total: 1, critical: 0 } });
    const cmd = getCmd();
    const run = cmd.commands.find((c: { name: () => string }) => c.name() === 'run')!;
    run._actionHandler(['[{"type":"sync"}]']);
    expect(mockCoordinateRepair).toHaveBeenCalled();
  });

  it('run subcommand outputs JSON with --json flag', () => {
    mockDetectFailures.mockReturnValue({ failures: [{ type: 'sync', source: 's1', message: 'e', severity: 'high' }], summary: { total: 1, critical: 0 } });
    const cmd = getCmd();
    const run = cmd.commands.find((c: { name: () => string }) => c.name() === 'run')!;
    run.setOptionValue('json', true);
    run._actionHandler(['[{"type":"sync"}]']);
    expect(mockPrintLine).toHaveBeenCalledWith(expect.stringContaining('"ok"'));
  });

  it('run subcommand handles errors', () => {
    const cmd = getCmd();
    const run = cmd.commands.find((c: { name: () => string }) => c.name() === 'run')!;
    run._actionHandler(['invalid json']);
    expect(exitSpy).toHaveBeenCalledWith(1);
  });

  it('report subcommand generates full resilience report', () => {
    mockDetectFailures.mockReturnValue({ failures: [{ type: 'integrity', source: 'db', message: 'x', severity: 'high' }], summary: { total: 1, critical: 0 } });
    const cmd = getCmd();
    const report = cmd.commands.find((c: { name: () => string }) => c.name() === 'report')!;
    report._actionHandler(['[{"type":"integrity"}]']);
    expect(mockResolveFallback).toHaveBeenCalled();
    expect(mockBuildRecoveryPlan).toHaveBeenCalled();
    expect(mockExecuteRecovery).toHaveBeenCalled();
    expect(mockUpdateCircuitBreaker).toHaveBeenCalled();
  });

  it('report subcommand handles errors', () => {
    const cmd = getCmd();
    const report = cmd.commands.find((c: { name: () => string }) => c.name() === 'report')!;
    report._actionHandler(['bad json']);
    expect(exitSpy).toHaveBeenCalledWith(1);
  });

  it('report subcommand shows critical count in JSON output', () => {
    mockDetectFailures.mockReturnValue({ failures: [{ type: 'integrity', source: 'db', message: 'x', severity: 'critical' }], summary: { total: 1, critical: 1 } });
    const cmd = getCmd();
    const report = cmd.commands.find((c: { name: () => string }) => c.name() === 'report')!;
    report.setOptionValue('json', true);
    report._actionHandler(['[{"type":"integrity"}]']);
    expect(mockPrintLine).toHaveBeenCalledWith(expect.stringContaining('"summary"'));
  });
});
