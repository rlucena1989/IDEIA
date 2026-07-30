import { QualityUseCase, type GateResult, type QualityPipelineOutput } from '../quality-use-case';

const mockFs = {
  exists: jest.fn(),
  read: jest.fn(),
  write: jest.fn(),
  append: jest.fn(),
  mkDir: jest.fn(),
  readDir: jest.fn(),
  readDirEntries: jest.fn(),
  readBuffer: jest.fn(),
  stat: jest.fn(),
  cwd: jest.fn().mockReturnValue('/test/project'),
  remove: jest.fn(),
  ensureDir: jest.fn(),
  copy: jest.fn(),
};

const mockShell = {
  exec: jest.fn(),
  execString: jest.fn(),
};

jest.mock('../../io', () => ({
  getIO: jest.fn(() => ({
    fs: mockFs,
    shell: mockShell,
    http: { post: jest.fn(), get: jest.fn() },
  })),
  resetIO: jest.fn(),
}));

describe('QualityUseCase', () => {
  let useCase: QualityUseCase;

  beforeEach(() => {
    jest.clearAllMocks();
    useCase = new QualityUseCase();
  });

  describe('runGate', () => {
    it('should pass commit gate when all checks pass', () => {
      mockShell.exec.mockReturnValue({ status: 0, stdout: '', stderr: '' });

      const result = useCase.runGate('commit');

      expect(result.ok).toBe(true);
      const gate = result.data as GateResult;
      expect(gate.passed).toBe(true);
      expect(gate.gate).toBe('commit');
      expect(gate.checks).toHaveLength(4);
      expect(gate.overallScore).toBeGreaterThanOrEqual(70);
    });

    it('should fail commit gate when tsc check fails', () => {
      mockShell.exec.mockReturnValue({ status: 1, stdout: '', stderr: 'error' });

      const result = useCase.runGate('commit');

      expect(result.ok).toBe(true);
      const gate = result.data as GateResult;
      expect(gate.passed).toBe(false);
      const tscCheck = gate.checks.find(c => c.name === 'tsc-noEmit');
      expect(tscCheck?.passed).toBe(false);
      expect(tscCheck?.score).toBe(0);
    });

    it('should pass PR gate', () => {
      mockShell.exec.mockReturnValue({ status: 0, stdout: '', stderr: '' });

      const result = useCase.runGate('pr');

      expect(result.ok).toBe(true);
      const gate = result.data as GateResult;
      expect(gate.gate).toBe('pr');
      expect(gate.checks).toHaveLength(8);
    });

    it('should fail for unknown gate', () => {
      const result = useCase.runGate('invalid' as any);

      expect(result.ok).toBe(false);
      expect(result.code).toBe(1);
      expect(result.message).toContain('Unknown quality gate');
    });
  });

  describe('checkPipeline', () => {
    it('should pass pipeline when all gates pass', () => {
      mockShell.exec.mockReturnValue({ status: 0, stdout: '', stderr: '' });

      const result = useCase.checkPipeline(['commit', 'pr']);

      expect(result.ok).toBe(true);
      const pipeline = result.data as QualityPipelineOutput;
      expect(pipeline.overallPassed).toBe(true);
      expect(pipeline.gates).toHaveLength(2);
      expect(pipeline.averageScore).toBeGreaterThan(0);
    });

    it('should fail pipeline when a gate fails', () => {
      mockShell.exec
        .mockReturnValueOnce({ status: 0, stdout: '', stderr: '' })  // tsc-noEmit for commit
        .mockReturnValueOnce({ status: 1, stdout: '', stderr: '' }); // typecheck for pr

      const result = useCase.checkPipeline(['commit', 'pr']);

      expect(result.ok).toBe(true);
      const pipeline = result.data as QualityPipelineOutput;
      expect(pipeline.overallPassed).toBe(false);
    });
  });

  describe('score', () => {
    it('should calculate quality scores', () => {
      mockShell.exec.mockReturnValue({ status: 0, stdout: '', stderr: '' });

      const result = useCase.score();

      expect(result.ok).toBe(true);
      expect(result.data?.scores).toBeDefined();
      expect(Object.keys(result.data?.scores || {})).toHaveLength(4);
      expect(result.data?.average).toBeGreaterThan(0);
    });

    it('should return lower score when tsc fails', () => {
      mockShell.exec.mockReturnValue({ status: 1, stdout: '', stderr: '' });

      const result = useCase.score();

      expect(result.ok).toBe(true);
      expect(result.data?.average).toBeLessThan(100);
      expect(Object.values(result.data?.scores || {})).toEqual([50, 50, 50, 50]);
    });
  });
});
