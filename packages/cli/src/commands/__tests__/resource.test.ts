import { resourceCommand } from '../resource';

jest.mock('../../utils/output', () => ({
  printHeader: jest.fn(),
  printLine: jest.fn(),
  printResult: jest.fn(),
}));

jest.mock('../../types/cli-result', () => ({
  success: jest.fn((msg: string, data?: unknown) => ({ ok: true, message: msg, data })),
  failure: jest.fn((msg: string) => ({ ok: false, message: msg })),
}));

const mockResourceManager = {
  updateConfig: jest.fn(),
  start: jest.fn(),
  stop: jest.fn(),
  getConfig: jest.fn(() => ({
    monitorIntervalMs: 5000,
    autoDegrade: true,
    selfHealing: { enabled: true },
    budget: { maxMemoryPercent: 80, maxCPUPercent: 80, maxProcessHeapMB: 512 },
  })),
  getStatus: jest.fn(() => ({
    running: true,
    degradationMode: false,
    totalActions: 3,
    budgetOk: true,
    budgetViolations: [] as string[],
    lastTrigger: null,
  })),
  getLastSnapshot: jest.fn(() => ({
    memory: { usedPercent: 45, freeMB: 8192, totalMB: 16384, processHeapUsedMB: 128, processHeapTotalMB: 256 },
    cpu: { percentEstimate: 30, loadAvg1m: 1.5 },
    timestamp: Date.now(),
  })),
  getMemoryTrend: jest.fn(() => ({
    isLeaking: false,
    leakRateMBperMin: 0,
    projectedOOMminutes: null,
  })),
};

jest.mock('@ideia/resource-manager', () => ({
  createResourceManager: jest.fn(() => mockResourceManager),
}));

describe('resourceCommand', () => {
  const cmd = resourceCommand();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(cmd).toBeDefined();
  });

  it('should have a name', () => {
    expect(typeof cmd.name()).toBe('string');
    expect(cmd.name().length).toBeGreaterThan(0);
  });

  it('should have description', () => {
    expect(cmd.description().length).toBeGreaterThan(0);
  });

  it('should have start, stop, status, config subcommands', () => {
    const subcommands = cmd.commands.map(c => c.name());
    expect(subcommands).toContain('start');
    expect(subcommands).toContain('stop');
    expect(subcommands).toContain('status');
    expect(subcommands).toContain('config');
  });

  it('start should start resource monitor', async () => {
    const { printHeader, printResult, printLine } = require('../../utils/output');
    await cmd.parseAsync(['node', 'test', 'start']);
    expect(mockResourceManager.start).toHaveBeenCalled();
    expect(printHeader).toHaveBeenCalledWith('Resource Monitor');
    expect(printResult).toHaveBeenCalledWith('Resource monitor started', true);
  });

  it('start --interval should update config', async () => {
    await cmd.parseAsync(['node', 'test', 'start', '--interval', '10000']);
    expect(mockResourceManager.updateConfig).toHaveBeenCalledWith({ monitorIntervalMs: 10000 });
  });

  it('start --json should print JSON', async () => {
    const { printLine } = require('../../utils/output');
    await cmd.parseAsync(['node', 'test', 'start', '--json']);
    expect(printLine).toHaveBeenCalledWith(expect.stringContaining('"started"'));
  });

  it('start handler error should return failure', async () => {
    mockResourceManager.start.mockImplementationOnce(() => { throw new Error('Start failed'); });
    const { failure } = require('../../types/cli-result');
    await cmd.parseAsync(['node', 'test', 'start']);
    expect(failure).toHaveBeenCalledWith('Start failed');
  });

  it('stop should stop resource monitor', async () => {
    const { printHeader, printResult } = require('../../utils/output');
    await cmd.parseAsync(['node', 'test', 'stop']);
    expect(mockResourceManager.stop).toHaveBeenCalled();
    expect(printHeader).toHaveBeenCalledWith('Resource Monitor');
    expect(printResult).toHaveBeenCalledWith('Resource monitor stopped', true);
  });

  it('stop --json should print JSON', async () => {
    const { printLine } = require('../../utils/output');
    await cmd.parseAsync(['node', 'test', 'stop', '--json']);
    expect(printLine).toHaveBeenCalledWith(expect.stringContaining('"stopped"'));
  });

  it('status should show current status', async () => {
    const { printHeader, printLine } = require('../../utils/output');
    await cmd.parseAsync(['node', 'test', 'status']);
    expect(printHeader).toHaveBeenCalledWith('Resource Status');
    expect(printLine).toHaveBeenCalledWith(expect.stringContaining('true'));
  });

  it('status with budget violations should display them', async () => {
    mockResourceManager.getStatus.mockReturnValueOnce({
      running: true,
      degradationMode: true,
      totalActions: 5,
      budgetOk: false,
      budgetViolations: ['Memory over 80%', 'CPU over 80%'],
      lastTrigger: { reason: 'Memory spike', metric: 'memory', value: 85, threshold: 80 } as any,
    });
    const { printLine } = require('../../utils/output');
    await cmd.parseAsync(['node', 'test', 'status']);
    expect(printLine).toHaveBeenCalledWith(expect.stringContaining('Memory over 80%'));
    expect(printLine).toHaveBeenCalledWith(expect.stringContaining('Memory spike'));
  });

  it('status with memory leak warning should display', async () => {
    mockResourceManager.getMemoryTrend.mockReturnValueOnce({
      isLeaking: true,
      leakRateMBperMin: 50,
      projectedOOMminutes: 10 as any,
    });
    const { printHeader, printLine } = require('../../utils/output');
    await cmd.parseAsync(['node', 'test', 'status']);
    expect(printHeader).toHaveBeenCalledWith('Memory Leak Warning');
    expect(printLine).toHaveBeenCalledWith(expect.stringContaining('50'));
  });

  it('status --json should print JSON', async () => {
    const { printLine } = require('../../utils/output');
    await cmd.parseAsync(['node', 'test', 'status', '--json']);
    expect(printLine).toHaveBeenCalledWith(expect.any(String));
  });

  it('config should show current config', async () => {
    const { printHeader } = require('../../utils/output');
    await cmd.parseAsync(['node', 'test', 'config']);
    expect(printHeader).toHaveBeenCalledWith('Resource Manager Config');
  });

  it('config --set should update config', async () => {
    const { printResult } = require('../../utils/output');
    await cmd.parseAsync(['node', 'test', 'config', '--set', 'monitorIntervalMs=10000']);
    expect(mockResourceManager.updateConfig).toHaveBeenCalledWith({ monitorIntervalMs: 10000 });
    expect(printResult).toHaveBeenCalledWith('Config monitorIntervalMs = 10000', true);
  });

  it('config --set with string value should preserve string', async () => {
    await cmd.parseAsync(['node', 'test', 'config', '--set', 'autoDegrade=false']);
    expect(mockResourceManager.updateConfig).toHaveBeenCalledWith({ autoDegrade: 'false' });
  });

  it('config --json should print JSON', async () => {
    const { printLine } = require('../../utils/output');
    await cmd.parseAsync(['node', 'test', 'config', '--json']);
    expect(printLine).toHaveBeenCalledWith(expect.any(String));
  });
});
