import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';

const mockControlTower = { emergencyStop: jest.fn<any>(), emergencyPause: jest.fn<any>(), emergencyRollback: jest.fn<any>(), emergencyResume: jest.fn<any>(), getStatus: jest.fn<any>() };
const mockCreateBus = jest.fn();
const mockCreateSafetyCircuit = jest.fn();
const mockCreateEmergencyStop = jest.fn();
const mockPrintHeader = jest.fn();
const mockPrintLine = jest.fn();
const mockPrintResult = jest.fn();

jest.mock('@ideia/control-tower', () => ({ ControlTower: jest.fn().mockImplementation(() => mockControlTower) }));
jest.mock('@ideia/safety-circuit', () => ({ SafetyCircuit: jest.fn(), createSafetyCircuit: (...args: unknown[]) => mockCreateSafetyCircuit(...args), EmergencyStop: jest.fn(), createEmergencyStop: (...args: unknown[]) => mockCreateEmergencyStop(...args) }));
jest.mock('@ideia/event-bus', () => ({ createBus: (...args: unknown[]) => mockCreateBus(...args) }));
jest.mock('../../utils/output', () => ({ printHeader: (...args: unknown[]) => mockPrintHeader(...args), printLine: (...args: unknown[]) => mockPrintLine(...args), printResult: (...args: unknown[]) => mockPrintResult(...args) }));

function getCmd() {
  let result: ReturnType<ReturnType<typeof Object>>;
  jest.isolateModules(() => {
    const mod = require('../emergency');
    result = mod.emergencyCommand();
  });
  return result!;
}

describe('emergencyCommand', () => {
  let exitSpy: jest.SpiedFunction<typeof process.exit>;

  beforeEach(() => {
    jest.clearAllMocks();
    exitSpy = jest.spyOn(process, 'exit').mockImplementation(() => undefined as never);
    mockCreateBus.mockResolvedValue({} as never);
    mockCreateSafetyCircuit.mockReturnValue({} as never);
    mockCreateEmergencyStop.mockReturnValue({} as never);
    mockControlTower.getStatus.mockReturnValue({ mode: 'manual', autonomyLevel: 0 });
    mockControlTower.emergencyStop.mockResolvedValue(undefined);
    mockControlTower.emergencyPause.mockResolvedValue(undefined);
    mockControlTower.emergencyRollback.mockResolvedValue(undefined);
    mockControlTower.emergencyResume.mockResolvedValue(undefined);
  });

  afterEach(() => { exitSpy.mockRestore(); });

  it('returns command named emergency', () => { expect(getCmd().name()).toBe('emergency'); });

  it('has subcommands stop, pause, rollback, resume', () => {
    const names = getCmd().commands.map((c: { name: () => string }) => c.name());
    expect(names).toEqual(['stop', 'pause', 'rollback', 'resume']);
  });

  it('stop subcommand calls controlTower.emergencyStop', async () => {
    const cmd = getCmd();
    const stop = cmd.commands.find((c: { name: () => string }) => c.name() === 'stop')!;
    stop.setOptionValue('reason', 'test stop');
    await stop._actionHandler([]);
    expect(mockControlTower.emergencyStop).toHaveBeenCalledWith('test stop');
    expect(mockPrintResult).toHaveBeenCalledWith('System halted', true);
  });

  it('stop subcommand uses default reason', async () => {
    const cmd = getCmd();
    const stop = cmd.commands.find((c: { name: () => string }) => c.name() === 'stop')!;
    await stop._actionHandler([]);
    expect(mockControlTower.emergencyStop).toHaveBeenCalledWith('User requested emergency stop');
  });

  it('stop subcommand outputs JSON with --json flag', async () => {
    const cmd = getCmd();
    const stop = cmd.commands.find((c: { name: () => string }) => c.name() === 'stop')!;
    stop.setOptionValue('json', true);
    await stop._actionHandler([]);
    expect(mockPrintLine).toHaveBeenCalledWith(expect.stringContaining('"status"'));
  });

  it('stop subcommand handles errors', async () => {
    mockControlTower.emergencyStop.mockRejectedValue(new Error('stop failed'));
    const cmd = getCmd();
    const stop = cmd.commands.find((c: { name: () => string }) => c.name() === 'stop')!;
    await stop._actionHandler([]);
    expect(exitSpy).toHaveBeenCalledWith(1);
  });

  it('pause subcommand calls controlTower.emergencyPause', async () => {
    const cmd = getCmd();
    const pause = cmd.commands.find((c: { name: () => string }) => c.name() === 'pause')!;
    pause.setOptionValue('reason', 'maintenance');
    await pause._actionHandler([]);
    expect(mockControlTower.emergencyPause).toHaveBeenCalledWith('maintenance');
    expect(mockPrintResult).toHaveBeenCalledWith('System paused', true);
  });

  it('pause subcommand outputs JSON with --json flag', async () => {
    const cmd = getCmd();
    const pause = cmd.commands.find((c: { name: () => string }) => c.name() === 'pause')!;
    pause.setOptionValue('json', true);
    await pause._actionHandler([]);
    expect(mockPrintLine).toHaveBeenCalledWith(expect.stringContaining('"status"'));
  });

  it('pause subcommand handles errors', async () => {
    mockControlTower.emergencyPause.mockRejectedValue(new Error('pause failed'));
    const cmd = getCmd();
    const pause = cmd.commands.find((c: { name: () => string }) => c.name() === 'pause')!;
    await pause._actionHandler([]);
    expect(exitSpy).toHaveBeenCalledWith(1);
  });

  it('rollback subcommand calls emergencyRollback with id', async () => {
    const cmd = getCmd();
    const rollback = cmd.commands.find((c: { name: () => string }) => c.name() === 'rollback')!;
    await rollback._actionHandler(['rb-001']);
    expect(mockControlTower.emergencyRollback).toHaveBeenCalledWith('rb-001');
    expect(mockPrintResult).toHaveBeenCalledWith('Rollback rb-001 completed', true);
  });

  it('rollback subcommand uses default "last" when id omitted', async () => {
    const cmd = getCmd();
    const rollback = cmd.commands.find((c: { name: () => string }) => c.name() === 'rollback')!;
    await rollback._actionHandler([undefined]);
    expect(mockControlTower.emergencyRollback).toHaveBeenCalledWith('last');
  });

  it('rollback subcommand outputs JSON with --json flag', async () => {
    const cmd = getCmd();
    const rollback = cmd.commands.find((c: { name: () => string }) => c.name() === 'rollback')!;
    rollback.setOptionValue('json', true);
    await rollback._actionHandler(['rb-1']);
    expect(mockPrintLine).toHaveBeenCalledWith(expect.stringContaining('"status"'));
  });

  it('rollback subcommand handles errors', async () => {
    mockControlTower.emergencyRollback.mockRejectedValue(new Error('rollback failed'));
    const cmd = getCmd();
    const rollback = cmd.commands.find((c: { name: () => string }) => c.name() === 'rollback')!;
    await rollback._actionHandler(['x']);
    expect(exitSpy).toHaveBeenCalledWith(1);
  });

  it('resume subcommand calls controlTower.emergencyResume', async () => {
    const cmd = getCmd();
    const resume = cmd.commands.find((c: { name: () => string }) => c.name() === 'resume')!;
    await resume._actionHandler([]);
    expect(mockControlTower.emergencyResume).toHaveBeenCalled();
    expect(mockPrintResult).toHaveBeenCalledWith('System resumed', true);
  });

  it('resume subcommand outputs JSON with --json flag', async () => {
    const cmd = getCmd();
    const resume = cmd.commands.find((c: { name: () => string }) => c.name() === 'resume')!;
    resume.setOptionValue('json', true);
    await resume._actionHandler([]);
    expect(mockPrintLine).toHaveBeenCalledWith(expect.stringContaining('"status"'));
  });

  it('resume subcommand handles errors', async () => {
    mockControlTower.emergencyResume.mockRejectedValue(new Error('resume failed'));
    const cmd = getCmd();
    const resume = cmd.commands.find((c: { name: () => string }) => c.name() === 'resume')!;
    await resume._actionHandler([]);
    expect(exitSpy).toHaveBeenCalledWith(1);
  });
});
