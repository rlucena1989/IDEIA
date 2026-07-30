import { spawnSync } from 'node:child_process';
import { getStages, runStages, StageDef } from '../stages';

jest.mock('node:child_process', () => ({
  spawnSync: jest.fn(),
}));

const mockSpawnSync = spawnSync as jest.MockedFunction<typeof spawnSync>;

beforeEach(() => {
  jest.clearAllMocks();
});

describe('getStages', () => {
  it('should return all stages when no name is provided', () => {
    const stages = getStages();
    expect(stages).toHaveLength(6);
    expect(stages[0].name).toBe('lint');
    expect(stages[1].name).toBe('test');
    expect(stages[2].name).toBe('security');
    expect(stages[3].name).toBe('build');
    expect(stages[4].name).toBe('architecture');
    expect(stages[5].name).toBe('deploy-readiness');
  });

  it('should return stages from the given name onwards', () => {
    const stages = getStages('build');
    expect(stages).toHaveLength(3);
    expect(stages[0].name).toBe('build');
    expect(stages[1].name).toBe('architecture');
    expect(stages[2].name).toBe('deploy-readiness');
  });

  it('should return single stage when name is the last one', () => {
    const stages = getStages('deploy-readiness');
    expect(stages).toHaveLength(1);
    expect(stages[0].name).toBe('deploy-readiness');
  });

  it('should throw for unknown stage name', () => {
    expect(() => getStages('nonexistent')).toThrow(
      'Stage "nonexistent" not found. Available: lint, test, security, build, architecture, deploy-readiness'
    );
  });
});

describe('runStages', () => {
  it('should run all stages successfully', () => {
    mockSpawnSync.mockReturnValue({
      status: 0,
      stdout: 'all good',
      stderr: '',
      pid: 1,
      output: ['', 'all good', ''],
      signal: null,
    } as any);

    const stages: StageDef[] = [
      { name: 'lint', command: 'npx', args: ['eslint', '.'] },
      { name: 'test', command: 'npx', args: ['jest'] },
    ];

    const results = runStages(stages, '/test/cwd');

    expect(results).toHaveLength(2);
    expect(results[0].passed).toBe(true);
    expect(results[0].stage).toBe('lint');
    expect(results[1].passed).toBe(true);
    expect(results[1].stage).toBe('test');
    expect(mockSpawnSync).toHaveBeenCalledTimes(2);
  });

  it('should stop pipeline on first failure', () => {
    mockSpawnSync
      .mockReturnValueOnce({
        status: 1,
        stdout: 'error found',
        stderr: 'lint error',
        pid: 1,
        output: ['', 'error found', 'lint error'],
        signal: null,
      } as any);

    const stages: StageDef[] = [
      { name: 'lint', command: 'npx', args: ['eslint', '.'] },
      { name: 'test', command: 'npx', args: ['jest'] },
    ];

    const results = runStages(stages, '/test/cwd');

    expect(results).toHaveLength(1);
    expect(results[0].passed).toBe(false);
    expect(results[0].stage).toBe('lint');
    expect(mockSpawnSync).toHaveBeenCalledTimes(1);
  });

  it('should call onStage callback for each completed stage', () => {
    mockSpawnSync.mockReturnValue({
      status: 0,
      stdout: 'ok',
      stderr: '',
      pid: 1,
      output: ['', 'ok', ''],
      signal: null,
    } as any);

    const stages: StageDef[] = [
      { name: 'lint', command: 'npx', args: ['eslint', '.'] },
      { name: 'test', command: 'npx', args: ['jest'] },
    ];

    const onStage = jest.fn();
    const results = runStages(stages, '/test/cwd', onStage);

    expect(onStage).toHaveBeenCalledTimes(2);
    expect(onStage).toHaveBeenNthCalledWith(1, expect.objectContaining({ stage: 'lint', passed: true }));
    expect(onStage).toHaveBeenNthCalledWith(2, expect.objectContaining({ stage: 'test', passed: true }));
    expect(results).toHaveLength(2);
  });

  it('should include durationMs and exitCode in results', () => {
    mockSpawnSync.mockReturnValue({
      status: 0,
      stdout: 'ok',
      stderr: '',
      pid: 1,
      output: ['', 'ok', ''],
      signal: null,
    } as any);

    const stages: StageDef[] = [
      { name: 'lint', command: 'npx', args: ['eslint', '.'] },
    ];

    const results = runStages(stages, '/test/cwd');

    expect(results[0].durationMs).toBeGreaterThanOrEqual(0);
    expect(results[0].exitCode).toBe(0);
  });

  it('should use stage.workDir if provided', () => {
    mockSpawnSync.mockReturnValue({
      status: 0,
      stdout: '',
      stderr: '',
      pid: 1,
      output: ['', '', ''],
      signal: null,
    } as any);

    const stages: StageDef[] = [
      { name: 'build', command: 'npm', args: ['run', 'build'], workDir: '/custom/path' },
    ];

    runStages(stages, '/default/cwd');

    expect(mockSpawnSync).toHaveBeenCalledWith(
      'npm',
      ['run', 'build'],
      expect.objectContaining({ cwd: '/custom/path' })
    );
  });

  it('should use cwd when stage has no workDir', () => {
    mockSpawnSync.mockReturnValue({
      status: 0,
      stdout: '',
      stderr: '',
      pid: 1,
      output: ['', '', ''],
      signal: null,
    } as any);

    const stages: StageDef[] = [
      { name: 'lint', command: 'npx', args: ['eslint', '.'] },
    ];

    runStages(stages, '/default/cwd');

    expect(mockSpawnSync).toHaveBeenCalledWith(
      'npx',
      ['eslint', '.'],
      expect.objectContaining({ cwd: '/default/cwd' })
    );
  });

  it('should set shell to true on win32', () => {
    const originalPlatform = process.platform;
    Object.defineProperty(process, 'platform', { value: 'win32', configurable: true });

    mockSpawnSync.mockReturnValue({
      status: 0,
      stdout: '',
      stderr: '',
      pid: 1,
      output: ['', '', ''],
      signal: null,
    } as any);

    const stages: StageDef[] = [
      { name: 'lint', command: 'npx', args: ['eslint', '.'] },
    ];

    runStages(stages, '/cwd');

    expect(mockSpawnSync).toHaveBeenCalledWith(
      'npx',
      ['eslint', '.'],
      expect.objectContaining({ shell: true })
    );

    Object.defineProperty(process, 'platform', { value: originalPlatform, configurable: true });
  });
});
