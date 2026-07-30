const mockCwd = jest.fn().mockReturnValue('/test/project');

jest.mock('../../../io', () => ({
  getIO: jest.fn(() => ({ fs: { cwd: mockCwd } })),
}));

const mockCreateEvolutionDaemon = jest.fn(() => ({
  getState: jest.fn(() => ({
    running: false, cyclesCompleted: 3, lastCycleAt: '2026-07-26',
    consecutiveFailures: 0, lastReport: { success: true },
  })),
  runCycle: jest.fn(() => ({
    cycleId: 'cycle-1', success: true, duration: 5000,
    stepsExecuted: 5, stepsFailed: 0, adrGenerated: 1,
    scanResults: [{ scanner: 'code', score: 85, findings: [] }],
    errors: [],
  })),
  start: jest.fn(), stop: jest.fn(),
}));

jest.mock('@ideia/scope-isolation', () => ({
  createScopeIsolation: jest.fn(() => ({})),
  createIsolationPolicy: jest.fn(() => ({ toConfig: jest.fn(() => ({ crossSpaceAccess: false })) })),
  createViolationAudit: jest.fn(() => ({ count: jest.fn(() => 0), list: jest.fn(() => []) })),
}));

jest.mock('@ideia/autonomous-evolution-engine', () => ({
  createEvolutionDaemon: mockCreateEvolutionDaemon,
}));

jest.mock('@ideia/event-bus', () => ({
  createBus: jest.fn(() => Promise.resolve({})),
}));

jest.mock('@ideia/audit-trail', () => ({
  AuditTrail: jest.fn(() => ({})),
}));

jest.mock('../../../types/cli-result', () => ({
  success: jest.fn((msg: string, data?: unknown) => ({ ok: true, message: msg, data })),
  failure: jest.fn((msg: string) => ({ ok: false, message: msg })),
  CliCommandResult: {},
}));

jest.mock('@ideia/logger', () => ({
  createLogger: jest.fn(() => ({ info: jest.fn(), error: jest.fn(), warn: jest.fn() })),
}));

import { ideiaSelfOptimizeCommand } from '../self-optimize-command';

function makeAction(cmdName: string, opts: Record<string, unknown> = {}) {
  const cmd = ideiaSelfOptimizeCommand();
  const sub = cmd.commands.find(c => c.name() === cmdName)!;
  (sub as any)._optionValues = opts;
  return (sub as any)._actionHandler;
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe('self-optimize status', () => {
  it('shows dashboard', async () => {
    await makeAction('status')([]);
    expect(mockCreateEvolutionDaemon).toHaveBeenCalled();
  });
});

describe('self-optimize run-cycle', () => {
  it('runs cycle', async () => {
    await makeAction('run-cycle')([]);
    expect(mockCreateEvolutionDaemon).toHaveBeenCalled();
  });
});

describe('self-optimize daemon', () => {
  it('starts', async () => { await makeAction('daemon', { action: 'start' })([]); });
  it('stops', async () => { await makeAction('daemon', { action: 'stop' })([]); });
});

describe('self-optimize violations', () => {
  it('shows violations', () => { makeAction('violations')([]); });
});
