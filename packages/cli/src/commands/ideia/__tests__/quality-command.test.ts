const mockComputeScorecard = jest.fn();
jest.mock('../../scorecard', () => ({
  computeScorecard: mockComputeScorecard,
}));

const mockRunPipeline = jest.fn();
const mockListAllCheckpoints = jest.fn();
jest.mock('../../../utils/gate/runner', () => ({
  runPipeline: mockRunPipeline,
  listAllCheckpoints: mockListAllCheckpoints,
}));

jest.mock('../../../utils/output', () => ({
  printHeader: jest.fn(), printLine: jest.fn(),
}));

import { ideiaQualityCommand } from '../quality-command';

function makeAction(cmdName: string, opts: Record<string, unknown> = {}) {
  const cmd = ideiaQualityCommand();
  const sub = cmd.commands.find(c => c.name() === cmdName)!;
  (sub as any)._optionValues = opts;
  return (sub as any)._actionHandler;
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe('quality check action', () => {
  it('runs pipeline', () => {
    const spyLog = jest.spyOn(console, 'log').mockImplementation(() => {});
    makeAction('check')([]);
    expect(mockRunPipeline).toHaveBeenCalled();
    spyLog.mockRestore();
  });
});

describe('quality scorecard action', () => {
  const sampleScorecard = {
    overallScore: 85, maturityLevel: 'A',
    categories: [{ name: 'Código', score: 90, weight: 20, maxScore: 100, items: [] }],
    evolution: { version: '18.0', categories: 1, items: 10 },
    recommendations: [{ text: 'Improve tests' }],
    trends: [], alerts: [], correlationAlerts: [],
    forecast: { forecast: 86, confidence: 'medium', trend: 'up', history: [] },
    git: { branch: '', commit: '', message: '' },
    meta: { durationMs: 0, scorecardVersion: '' },
  };

  it('shows scorecard', () => {
    mockComputeScorecard.mockReturnValue(sampleScorecard);
    const spyLog = jest.spyOn(console, 'log').mockImplementation(() => {});
    makeAction('scorecard')([]);
    expect(spyLog).toHaveBeenCalledWith(expect.stringContaining('85/100'));
    spyLog.mockRestore();
  });

  it('outputs JSON', () => {
    mockComputeScorecard.mockReturnValue({ overallScore: 80, maturityLevel: 'B' });
    const spyLog = jest.spyOn(console, 'log').mockImplementation(() => {});
    makeAction('scorecard', { json: true })([]);
    expect(spyLog).toHaveBeenCalledWith(expect.stringContaining('"overallScore"'));
    spyLog.mockRestore();
  });
});

describe('quality gates action', () => {
  it('lists gates', () => {
    mockListAllCheckpoints.mockReturnValue(['cp-1']);
    const spyLog = jest.spyOn(console, 'log').mockImplementation(() => {});
    makeAction('gates')([]);
    expect(spyLog).toHaveBeenCalledWith(expect.stringContaining('Quality Gates Disponíveis'));
    spyLog.mockRestore();
  });

  it('shows empty message', () => {
    mockListAllCheckpoints.mockReturnValue([]);
    const spyLog = jest.spyOn(console, 'log').mockImplementation(() => {});
    makeAction('gates')([]);
    expect(spyLog).toHaveBeenCalledWith(expect.stringContaining('Nenhum quality gate'));
    spyLog.mockRestore();
  });
});
