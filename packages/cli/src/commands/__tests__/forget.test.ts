const mockFindByUserId = jest.fn();
const mockForget = jest.fn();
const mockForgetByField = jest.fn();
const mockGetRequest = jest.fn();
const mockGetRequestsByUser = jest.fn();
const mockListStores = jest.fn();
const mockRegisterStore = jest.fn();

jest.mock('@ideia/privacy', () => ({
  RightToBeForgotten: jest.fn(() => ({
    findByUserId: mockFindByUserId,
    forget: mockForget,
    forgetByField: mockForgetByField,
    getRequest: mockGetRequest,
    getRequestsByUser: mockGetRequestsByUser,
    listStores: mockListStores,
    registerStore: mockRegisterStore,
  })),
  DataStore: {},
}));

const mockCreateEnvelope = jest.fn() as any;
jest.mock('../../hardening/output-contract', () => ({
  createEnvelope: (...args: unknown[]) => mockCreateEnvelope(...args),
}));

const mockPrintHeader = jest.fn();
const mockPrintLine = jest.fn();
const mockPrintResult = jest.fn();
jest.mock('../../utils/output', () => ({
  printHeader: mockPrintHeader,
  printLine: mockPrintLine,
  printResult: mockPrintResult,
}));

jest.mock('../../utils/version', () => ({
  getCliVersion: jest.fn(() => '1.0.0'),
}));

import { forgetCommand } from '../forget';

function makeAction(cmdName: string, opts: Record<string, unknown> = {}) {
  const cmd = forgetCommand();
  const sub = cmd.commands.find(c => c.name() === cmdName)!;
  (sub as any)._optionValues = opts;
  return (sub as any)._actionHandler;
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe('forget user action', () => {
  it('handles dry-run mode', async () => {
    mockFindByUserId.mockResolvedValue([
      { store: 'db', id: 'record-1' },
      { store: 'cache', id: 'record-2' },
    ]);
    const action = makeAction('user', { dryRun: true });
    await action(['user-123']);
    expect(mockPrintHeader).toHaveBeenCalledWith(expect.stringContaining('Dry Run'));
    expect(mockPrintLine).toHaveBeenCalledWith(expect.stringContaining('user-123'));
    expect(mockPrintLine).toHaveBeenCalledWith(expect.stringContaining('2'));
  });

  it('executes forget when not dry-run', async () => {
    mockForget.mockResolvedValue({
      requestId: 'req-1', status: 'completed', storesAffected: ['db'],
      totalRecordsDeleted: 5, errors: [],
    });
    const action = makeAction('user', { reason: 'GDPR request' });
    await action(['user-456']);
    expect(mockForget).toHaveBeenCalledWith('user-456', 'GDPR request');
    expect(mockPrintHeader).toHaveBeenCalledWith(expect.stringContaining('Right to Be Forgotten'));
    expect(mockPrintLine).toHaveBeenCalledWith(expect.stringContaining('req-1'));
    expect(mockPrintResult).toHaveBeenCalledWith(expect.stringContaining('completed'), true);
  });

  it('handles errors gracefully', async () => {
    mockForget.mockRejectedValue(new Error('Database error'));
    const action = makeAction('user');
    await action(['user-789']);
    expect(mockPrintResult).toHaveBeenCalledWith(expect.stringContaining('Database error'), false);
  });
});

describe('forget field action', () => {
  it('executes forgetByField and prints result', async () => {
    mockForgetByField.mockResolvedValue({
      requestId: 'req-field-1', status: 'completed', storesAffected: ['log'],
      totalRecordsDeleted: 3, errors: [],
    });
    const action = makeAction('field');
    await action(['email', 'test@example.com']);
    expect(mockForgetByField).toHaveBeenCalledWith('email', 'test@example.com', 'Field cleanup');
    expect(mockPrintHeader).toHaveBeenCalledWith(expect.stringContaining('Forget by Field'));
  });

  it('handles errors', async () => {
    mockForgetByField.mockRejectedValue(new Error('Field error'));
    const action = makeAction('field');
    await action(['phone', '12345']);
    expect(mockPrintResult).toHaveBeenCalledWith(expect.stringContaining('Field error'), false);
  });
});

describe('forget status action', () => {
  it('shows request status', () => {
    mockGetRequest.mockReturnValue({
      id: 'req-1', userId: 'user-1', status: 'completed',
      reason: 'GDPR', requestedAt: '2026-07-01', completedAt: '2026-07-02', recordsDeleted: 5,
    });
    const action = makeAction('status');
    action(['req-1']);
    expect(mockPrintHeader).toHaveBeenCalledWith(expect.stringContaining('Forget Request Status'));
  });

  it('shows not found message', () => {
    mockGetRequest.mockReturnValue(null);
    const action = makeAction('status');
    action(['req-missing']);
    expect(mockPrintResult).toHaveBeenCalledWith(expect.stringContaining('not found'), false);
  });
});

describe('forget history action', () => {
  it('shows request history for user', () => {
    mockGetRequestsByUser.mockReturnValue([
      { id: 'req-1', status: 'completed', recordsDeleted: 3, requestedAt: '2026-07-01' },
    ]);
    const action = makeAction('history');
    action(['user-1']);
    expect(mockPrintHeader).toHaveBeenCalledWith(expect.stringContaining('Forget History'));
  });

  it('shows empty message when no requests', () => {
    mockGetRequestsByUser.mockReturnValue([]);
    const action = makeAction('history');
    action(['user-empty']);
    expect(mockPrintLine).toHaveBeenCalledWith(expect.stringContaining('No requests found'));
  });
});

describe('forget stores action', () => {
  it('lists registered stores', () => {
    mockListStores.mockReturnValue(['db', 'cache', 'log']);
    const action = makeAction('stores');
    action([]);
    expect(mockPrintHeader).toHaveBeenCalledWith(expect.stringContaining('Registered Data Stores'));
    expect(mockPrintLine).toHaveBeenCalledWith(expect.stringContaining('db'));
  });

  it('shows empty when no stores', () => {
    mockListStores.mockReturnValue([]);
    const action = makeAction('stores');
    action([]);
    expect(mockPrintLine).toHaveBeenCalledWith(expect.stringContaining('No stores registered'));
  });
});
