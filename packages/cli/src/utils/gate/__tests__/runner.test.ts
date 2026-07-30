import { runPipeline, printStatus } from '../runner';
import { Checkpoint, loadLatestGateCheckpoint, saveGateCheckpoint } from '../checkpoint';
import { getStages, runStages, StageDef } from '../stages';

jest.mock('../checkpoint', () => ({
  loadLatestGateCheckpoint: jest.fn(),
  saveGateCheckpoint: jest.fn(),
  listGateCheckpoints: jest.fn(),
}));

jest.mock('../stages', () => ({
  getStages: jest.fn(),
  runStages: jest.fn(),
}));

const mockLoadLatest = loadLatestGateCheckpoint as jest.MockedFunction<typeof loadLatestGateCheckpoint>;
const mockSaveCheckpoint = saveGateCheckpoint as jest.MockedFunction<typeof saveGateCheckpoint>;
const mockGetStages = getStages as jest.MockedFunction<typeof getStages>;
const mockRunStages = runStages as jest.MockedFunction<typeof runStages>;

const MOCK_STAGES: StageDef[] = [
  { name: 'lint', command: 'npx', args: ['eslint', '.'] },
  { name: 'test', command: 'npx', args: ['jest'] },
];

function okResult(stage: string): ReturnType<typeof runStages> extends infer R ? R : never {
  return [{ stage, passed: true, durationMs: 50, output: 'ok', exitCode: 0 }] as any;
}

let exitCode: number | undefined;

beforeEach(() => {
  jest.clearAllMocks();
  exitCode = undefined;
  jest.spyOn(process, 'exit').mockImplementation(((code?: number) => {
    exitCode = code;
    throw new Error('process.exit');
  }) as any);
  jest.spyOn(console, 'log').mockImplementation(() => {});
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe('runPipeline', () => {
  it('should run all stages from the beginning', () => {
    mockGetStages.mockReturnValue(MOCK_STAGES);
    mockRunStages.mockReturnValue([
      { stage: 'lint', passed: true, durationMs: 50, output: 'ok', exitCode: 0 },
      { stage: 'test', passed: true, durationMs: 100, output: 'ok', exitCode: 0 },
    ]);

    expect(() => runPipeline('/cwd')).toThrow('process.exit');
    expect(exitCode).toBe(0);
    expect(mockGetStages).toHaveBeenCalledWith();
    expect(mockRunStages).toHaveBeenCalledWith(MOCK_STAGES, '/cwd', expect.any(Function));
    expect(mockSaveCheckpoint).toHaveBeenCalled();
  });

  it('should run stages from a specific start stage', () => {
    const buildStages = MOCK_STAGES.slice(1);
    mockGetStages.mockReturnValue(buildStages);
    mockRunStages.mockReturnValue([
      { stage: 'test', passed: true, durationMs: 100, output: 'ok', exitCode: 0 },
    ]);

    expect(() => runPipeline('/cwd', 'test')).toThrow('process.exit');
    expect(exitCode).toBe(0);
    expect(mockGetStages).toHaveBeenCalledWith('test');
  });

  it('should resume from failed stage when checkpoint exists', () => {
    const checkpoint: Checkpoint = {
      id: 'gate-resume',
      timestamp: '2026-07-26T00:00:00.000Z',
      stages: [
        { stage: 'lint', passed: true, durationMs: 50, output: 'ok', exitCode: 0 },
        { stage: 'test', passed: false, durationMs: 100, output: 'fail', exitCode: 1 },
      ],
      currentStage: 2,
      completed: false,
    };

    mockLoadLatest.mockReturnValue(checkpoint);
    mockGetStages.mockReturnValue(MOCK_STAGES.slice(1));
    mockRunStages.mockReturnValue([
      { stage: 'test', passed: true, durationMs: 80, output: 'ok', exitCode: 0 },
    ]);

    expect(() => runPipeline('/cwd', undefined, true)).toThrow('process.exit');
    expect(exitCode).toBe(0);
    expect(mockGetStages).toHaveBeenCalledWith('test');
  });

  it('should skip resume when checkpoint is fully passed', () => {
    const checkpoint: Checkpoint = {
      id: 'gate-done',
      timestamp: '2026-07-26T00:00:00.000Z',
      stages: [
        { stage: 'lint', passed: true, durationMs: 50, output: 'ok', exitCode: 0 },
        { stage: 'test', passed: true, durationMs: 100, output: 'ok', exitCode: 0 },
      ],
      currentStage: 2,
      completed: true,
    };

    mockLoadLatest.mockReturnValue(checkpoint);

    runPipeline('/cwd', undefined, true);

    expect(mockGetStages).not.toHaveBeenCalled();
    expect(mockRunStages).not.toHaveBeenCalled();
    expect(exitCode).toBeUndefined();
  });

  it('should start from beginning when resume but no checkpoint', () => {
    mockLoadLatest.mockReturnValue(null);
    mockGetStages.mockReturnValue(MOCK_STAGES);
    mockRunStages.mockReturnValue([
      { stage: 'lint', passed: true, durationMs: 50, output: 'ok', exitCode: 0 },
    ]);

    expect(() => runPipeline('/cwd', undefined, true)).toThrow('process.exit');
    expect(exitCode).toBe(0);
    expect(mockGetStages).toHaveBeenCalledWith();
  });

  it('should exit with failure count when stages fail', () => {
    mockGetStages.mockReturnValue(MOCK_STAGES);
    mockRunStages.mockReturnValue([
      { stage: 'lint', passed: false, durationMs: 30, output: 'err', exitCode: 1 },
    ]);

    expect(() => runPipeline('/cwd')).toThrow('process.exit');
    expect(exitCode).toBe(1);
  });

  it('should output JSON when json flag is set', () => {
    mockGetStages.mockReturnValue(MOCK_STAGES);
    mockRunStages.mockReturnValue([
      { stage: 'lint', passed: true, durationMs: 50, output: 'ok', exitCode: 0 },
    ]);

    const logSpy = jest.spyOn(console, 'log');

    expect(() => runPipeline('/cwd', undefined, undefined, true)).toThrow('process.exit');
    expect(exitCode).toBe(0);
    expect(logSpy).toHaveBeenLastCalledWith(expect.stringContaining('"completed"'));
  });
});

describe('printStatus', () => {
  it('should print checkpoint status', () => {
    const checkpoint: Checkpoint = {
      id: 'gate-status',
      timestamp: '2026-07-26T00:00:00.000Z',
      stages: [
        { stage: 'lint', passed: true, durationMs: 50, output: 'ok', exitCode: 0 },
        { stage: 'test', passed: false, durationMs: 100, output: 'fail', exitCode: 1 },
      ],
      currentStage: 1,
      completed: false,
    };

    mockLoadLatest.mockReturnValue(checkpoint);
    mockGetStages.mockReturnValue(MOCK_STAGES);

    const logSpy = jest.spyOn(console, 'log');

    printStatus('/cwd');

    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('Quality Gate Status'));
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('lint'));
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('test'));
  });

  it('should print JSON when json flag is set', () => {
    const checkpoint: Checkpoint = {
      id: 'gate-status-json',
      timestamp: '2026-07-26T00:00:00.000Z',
      stages: [],
      currentStage: 0,
      completed: false,
    };

    mockLoadLatest.mockReturnValue(checkpoint);

    const logSpy = jest.spyOn(console, 'log');
    printStatus('/cwd', true);

    expect(logSpy).toHaveBeenCalledWith(JSON.stringify(checkpoint, null, 2));
  });

  it('should print not-found message when no checkpoint', () => {
    mockLoadLatest.mockReturnValue(null);

    const logSpy = jest.spyOn(console, 'log');
    printStatus('/cwd');

    expect(logSpy).toHaveBeenCalledWith(
      expect.stringContaining('Nenhum checkpoint encontrado')
    );
  });
});
