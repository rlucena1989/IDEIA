const mockCreate = jest.fn();
const mockList = jest.fn();

jest.mock('@ideia/incident-manager', () => ({
  IncidentManager: jest.fn(() => ({
    create: mockCreate,
    list: mockList,
  })),
  IncidentSeverity: { critical: 'critical', high: 'high', medium: 'medium', low: 'low' },
  IncidentStatus: { detected: 'detected', acknowledged: 'acknowledged', resolved: 'resolved', closed: 'closed' },
  IncidentNotifier: jest.fn(() => ({ notifyCreated: jest.fn() })),
  loadNotifierConfig: jest.fn(() => ({ slack: null, email: null, pager: null, enabled: false })),
}));

jest.mock('../../utils/output', () => ({
  printHeader: jest.fn(),
  printLine: jest.fn(),
  printResult: jest.fn(),
}));

import { incidentCommand } from '../incident';

function makeAction(cmdName: string, opts: Record<string, unknown> = {}) {
  const cmd = incidentCommand();
  const sub = cmd.commands.find(c => c.name() === cmdName)!;
  (sub as any)._optionValues = opts;
  return (sub as any)._actionHandler;
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe('incident create action', () => {
  it('creates incident', () => {
    mockCreate.mockReturnValue({ id: 'inc-new', title: 'Test Crash' });
    const action = makeAction('create', { severity: 'high' });
    const spyExit = jest.spyOn(process, 'exit').mockImplementation((() => {}) as never);
    action(['Test Crash']);
    expect(mockCreate).toHaveBeenCalledWith(expect.objectContaining({
      title: 'Test Crash', severity: 'high',
    }));
    spyExit.mockRestore();
  });

  it('rejects invalid severity', () => {
    const spyError = jest.spyOn(console, 'error').mockImplementation(() => {});
    const spyExit = jest.spyOn(process, 'exit').mockImplementation((() => {}) as never);
    const action = makeAction('create', { severity: 'invalid' });
    action(['Test']);
    expect(spyError).toHaveBeenCalledWith(expect.stringContaining('Severidade inválida'));
    spyExit.mockRestore();
    spyError.mockRestore();
  });
});

describe('incident list action', () => {
  it('lists incidents', () => {
    mockList.mockReturnValue([]);
    const action = makeAction('list');
    action([]);
    expect(mockList).toHaveBeenCalled();
  });
});
