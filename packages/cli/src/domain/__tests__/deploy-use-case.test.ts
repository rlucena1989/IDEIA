import { DeployUseCase, type DeployOutput } from '../deploy-use-case';

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

describe('DeployUseCase', () => {
  let useCase: DeployUseCase;

  beforeEach(() => {
    jest.clearAllMocks();
    useCase = new DeployUseCase();
  });

  it('should deploy successfully with quality gate check', () => {
    mockShell.exec.mockReturnValue({ status: 0, stdout: '', stderr: '' });

    const result = useCase.execute({ version: '1.0.0', environment: 'staging' });

    expect(result.ok).toBe(true);
    expect(result.code).toBe(0);
    expect((result.data as DeployOutput).status).toBe('deployed');
    expect((result.data as DeployOutput).version).toBe('1.0.0');
    expect((result.data as DeployOutput).environment).toBe('staging');
    expect((result.data as DeployOutput).steps.length).toBeGreaterThanOrEqual(3);
    expect(mockShell.exec).toHaveBeenCalledWith('npx', ['tsc', '--noEmit'], undefined, 60000);
    expect(mockShell.exec).toHaveBeenCalledWith('npx', ['tsc', '-b'], undefined, 120000);
  });

  it('should include canary step when canaryPercent > 0', () => {
    mockShell.exec.mockReturnValue({ status: 0, stdout: '', stderr: '' });

    const result = useCase.execute({ version: '2.0.0', environment: 'canary', canaryPercent: 10 });

    expect(result.ok).toBe(true);
    const steps = (result.data as DeployOutput).steps.map(s => s.step);
    expect(steps).toContain('canary-deploy-10%');
  });

  it('should set status to failed when build fails', () => {
    mockShell.exec.mockReturnValue({ status: 1, stdout: '', stderr: 'error' });

    const result = useCase.execute({ version: '1.0.0', environment: 'production' });

    expect(result.ok).toBe(true);
    expect((result.data as DeployOutput).status).toBe('failed');
    const buildStep = (result.data as DeployOutput).steps.find(s => s.step === 'build');
    expect(buildStep?.success).toBe(false);
  });

  it('should skip shell exec steps in dryRun mode', () => {
    mockShell.exec.mockReturnValue({ status: 0, stdout: '', stderr: '' });

    const result = useCase.execute({ version: '1.0.0', environment: 'staging', dryRun: true });

    expect(result.ok).toBe(true);
    expect((result.data as DeployOutput).status).toBe('deployed');
    expect(mockShell.exec).not.toHaveBeenCalled();
  });

  it('should fail validation with invalid version', () => {
    const result = useCase.execute({ version: 'invalid', environment: 'production' });

    expect(result.ok).toBe(false);
    expect(result.code).toBe(1);
    expect(result.message).toContain('Invalid deploy config');
  });

  it('should fail validation with invalid environment', () => {
    const result = useCase.execute({ version: '1.0.0', environment: 'nonexistent' as any });

    expect(result.ok).toBe(false);
    expect(result.code).toBe(1);
    expect(result.message).toContain('Invalid deploy config');
  });
});
