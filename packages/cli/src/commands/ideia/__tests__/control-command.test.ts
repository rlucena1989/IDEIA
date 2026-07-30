const mockGetStatus = jest.fn();
const mockEmergencyStop = jest.fn();
const mockEmergencyPause = jest.fn();
const mockEmergencyResume = jest.fn();
const mockEmergencyRollback = jest.fn();
const mockSetAutonomyLevel = jest.fn();

jest.mock('@ideia/control-tower', () => ({
  ControlTower: jest.fn(() => ({
    getStatus: mockGetStatus,
    emergencyStop: mockEmergencyStop,
    emergencyPause: mockEmergencyPause,
    emergencyResume: mockEmergencyResume,
    emergencyRollback: mockEmergencyRollback,
    setAutonomyLevel: mockSetAutonomyLevel,
  })),
}));

const mockSafetyGetStatus = jest.fn();
jest.mock('@ideia/safety-circuit', () => ({
  createSafetyCircuit: jest.fn(() => ({
    getStatus: mockSafetyGetStatus,
  })),
  createContinuityScheduler: jest.fn(() => ({
    pause: jest.fn(), resume: jest.fn(),
    getState: jest.fn(() => ({ paused: false, pauseReason: '', pausedAt: null, resumesScheduled: 0, resumesExecuted: 0 })),
    getEvents: jest.fn(() => []),
  })),
}));

const mockEscalate = jest.fn();
jest.mock('@ideia/bhp', () => ({
  createEscalationProtocol: jest.fn(() => ({
    escalate: mockEscalate,
  })),
}));

jest.mock('../../../types/cli-result', () => ({
  success: jest.fn((msg: string, data?: unknown) => ({ ok: true, message: msg, data })),
  failure: jest.fn((msg: string) => ({ ok: false, message: msg })),
  CliCommandResult: {},
}));

jest.mock('@ideia/logger', () => ({
  createLogger: jest.fn(() => ({ info: jest.fn(), error: jest.fn(), warn: jest.fn() })),
}));

import { ideiaControlCommand } from '../control-command';

function makeAction(cmdName: string, opts: Record<string, unknown> = {}) {
  const cmd = ideiaControlCommand();
  const sub = cmd.commands.find(c => c.name() === cmdName)!;
  (sub as any)._optionValues = opts;
  return (sub as any)._actionHandler;
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe('control status action', () => {
  it('returns status data', () => {
    mockGetStatus.mockReturnValue({ autonomyLevel: 'N2', healthPercent: 90, mode: 'normal', pendingDecisions: 0, activeTriggers: [], lastAction: 'none' });
    const result = makeAction('status')([]);
    expect(mockGetStatus).toHaveBeenCalled();
    expect(result).toBeDefined();
  });
});

describe('control safety action', () => {
  it('returns safety status', () => {
    mockSafetyGetStatus.mockReturnValue({ mode: 'active', activeTriggers: [], lastDecision: null });
    makeAction('safety')([]);
    expect(mockSafetyGetStatus).toHaveBeenCalled();
  });
});

describe('control emergency action', () => {
  it('stops', () => { makeAction('emergency', { action: 'stop', reason: 'test' })([]); expect(mockEmergencyStop).toHaveBeenCalledWith('test'); });
  it('pauses', () => { makeAction('emergency', { action: 'pause', reason: 'User request' })([]); expect(mockEmergencyPause).toHaveBeenCalledWith('User request'); });
  it('resumes', () => { makeAction('emergency', { action: 'resume' })([]); expect(mockEmergencyResume).toHaveBeenCalled(); });
  it('rollbacks', () => { makeAction('emergency', { action: 'rollback', reason: 'User request' })([]); expect(mockEmergencyRollback).toHaveBeenCalledWith('User request'); });
});

describe('control autonomy action', () => {
  it('sets autonomy level', () => {
    makeAction('autonomy', { level: 'autonomous' })([]);
    expect(mockSetAutonomyLevel).toHaveBeenCalledWith('autonomous');
  });
});

describe('control escalate action', () => {
  it('creates escalation', () => {
    mockEscalate.mockReturnValue({ id: 'esc-1', issue: 'test', level: 'warning', status: 'open' });
    makeAction('escalate', { issue: 'test issue', level: 'warning', context: '' })([]);
    expect(mockEscalate).toHaveBeenCalledWith('test issue', '', 'warning');
  });
});

describe('control continuity action', () => {
  it('shows scheduler state', () => {
    makeAction('continuity', { action: 'status' })([]);
  });
});
