const mockExistsSync = jest.fn();
const mockReadFileSync = jest.fn();
const mockReaddirSync = jest.fn();

jest.mock('node:fs', () => ({
  existsSync: mockExistsSync, readFileSync: mockReadFileSync, readdirSync: mockReaddirSync,
}));

const mockComputeStatus = jest.fn();
jest.mock('../../status', () => ({ computeStatus: mockComputeStatus }));

const mockDetectStack = jest.fn();
jest.mock('../../detect', () => ({ detectStack: mockDetectStack }));

const mockListEngineerSessions = jest.fn();
jest.mock('../../engineer', () => ({ listEngineerSessions: mockListEngineerSessions }));

const mockComputeScorecard = jest.fn();
jest.mock('../../scorecard', () => ({ computeScorecard: mockComputeScorecard }));

import { ideiaStatusCommand } from '../status-command';

function makeAction(opts: Record<string, unknown> = {}) {
  const cmd = ideiaStatusCommand();
  (cmd as any)._optionValues = opts;
  return (cmd as any)._actionHandler;
}

beforeEach(() => {
  jest.clearAllMocks();
  mockDetectStack.mockReturnValue({ languages: ['TypeScript'], frameworks: ['Next.js'] });
  mockComputeStatus.mockReturnValue({ finalHealth: 85 });
  mockListEngineerSessions.mockReturnValue([]);
  mockComputeScorecard.mockReturnValue({ overallScore: 80, maturityLevel: 'A' });
  mockExistsSync.mockReturnValue(false);
});

describe('status action', () => {
  it('shows dashboard', () => {
    const spyLog = jest.spyOn(console, 'log').mockImplementation(() => {});
    makeAction()([]);
    expect(spyLog).toHaveBeenCalledWith(expect.stringContaining('Dashboard'));
    expect(mockComputeStatus).toHaveBeenCalled();
    spyLog.mockRestore();
  });

  it('outputs JSON', () => {
    const spyLog = jest.spyOn(console, 'log').mockImplementation(() => {});
    makeAction({ json: true })([]);
    expect(spyLog).toHaveBeenCalledWith(expect.stringContaining('"stack"'));
    spyLog.mockRestore();
  });

  it('counts decisions', () => {
    mockExistsSync.mockReturnValue(true);
    mockReaddirSync.mockReturnValue(['dec-1.json', 'dec-2.md']);
    const spyLog = jest.spyOn(console, 'log').mockImplementation(() => {});
    makeAction()([]);
    expect(spyLog).toHaveBeenCalledWith(expect.stringContaining('Decisões registradas'));
    spyLog.mockRestore();
  });

  it('reads autonomy level', () => {
    mockExistsSync.mockReturnValue(true);
    mockReaddirSync.mockReturnValue([]);
    mockReadFileSync.mockReturnValue(JSON.stringify({ ideia: { autonomy: 'N3' } }));
    const spyLog = jest.spyOn(console, 'log').mockImplementation(() => {});
    makeAction()([]);
    expect(spyLog).toHaveBeenCalledWith(expect.stringContaining('Autonomia'));
    spyLog.mockRestore();
  });

  it('categorizes sessions', () => {
    mockListEngineerSessions.mockReturnValue([
      { status: 'planning', task: 'T1', id: 's1', updatedAt: Date.now() },
      { status: 'completed', task: 'T2', id: 's2', updatedAt: Date.now() },
    ]);
    const spyLog = jest.spyOn(console, 'log').mockImplementation(() => {});
    makeAction()([]);
    expect(spyLog).toHaveBeenCalledWith(expect.stringContaining('Ideias'));
    spyLog.mockRestore();
  });
});
