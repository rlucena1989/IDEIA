import { InitUseCase, type InitOutput } from '../init-use-case';

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

describe('InitUseCase', () => {
  let useCase: InitUseCase;

  beforeEach(() => {
    jest.clearAllMocks();
    useCase = new InitUseCase();
  });

  it('should create project structure on success', () => {
    mockFs.exists.mockReturnValue(false);

    const result = useCase.execute('my-app');

    expect(result.ok).toBe(true);
    expect(result.code).toBe(0);
    expect(result.data?.projectName).toBe('my-app');
    expect(result.data?.filesCreated).toBe(5);
    expect(result.data?.projectPath).toBe('/test/project/my-app');
    expect(mockFs.mkDir).toHaveBeenCalledTimes(8);
    expect(mockFs.mkDir).toHaveBeenCalledWith('/test/project/my-app', true);
    expect(mockFs.mkDir).toHaveBeenCalledWith('/test/project/my-app/src', true);
    expect(mockFs.mkDir).toHaveBeenCalledWith('/test/project/my-app/.ai', true);
    expect(mockFs.write).toHaveBeenCalledTimes(4);
    expect(mockFs.write).toHaveBeenCalledWith('/test/project/my-app/package.json', expect.any(String));
    expect(mockFs.write).toHaveBeenCalledWith('/test/project/my-app/tsconfig.json', expect.any(String));
    expect(mockFs.write).toHaveBeenCalledWith('/test/project/my-app/.gitignore', expect.any(String));
    expect(mockFs.write).toHaveBeenCalledWith('/test/project/my-app/README.md', expect.any(String));
  });

  it('should run git init when gitInit is true', () => {
    mockFs.exists.mockReturnValue(false);
    mockShell.exec.mockReturnValue({ status: 0, stdout: '', stderr: '' });

    const result = useCase.execute('my-app', { gitInit: true });

    expect(result.ok).toBe(true);
    expect(mockShell.exec).toHaveBeenCalledWith('git', ['init', '/test/project/my-app']);
  });

  it('should fail when directory already exists and dryRun is false', () => {
    mockFs.exists.mockReturnValue(true);

    const result = useCase.execute('existing-app');

    expect(result.ok).toBe(false);
    expect(result.code).toBe(1);
    expect(result.message).toContain('already exists');
    expect(mockFs.mkDir).not.toHaveBeenCalled();
    expect(mockFs.write).not.toHaveBeenCalled();
  });

  it('should skip directory existence check when dryRun is true', () => {
    mockFs.exists.mockReturnValue(true);

    const result = useCase.execute('existing-app', { dryRun: true });

    expect(result.ok).toBe(true);
    expect(mockFs.mkDir).not.toHaveBeenCalled();
    expect(mockFs.write).not.toHaveBeenCalled();
    expect(result.data?.filesCreated).toBe(0);
  });

  it('should fail validation for empty project name', () => {
    const result = useCase.execute('');

    expect(result.ok).toBe(false);
    expect(result.code).toBe(1);
    expect(result.message).toContain('Invalid init request');
  });

  it('should use template and autonomyLevel from options', () => {
    mockFs.exists.mockReturnValue(false);

    const result = useCase.execute('my-app', { template: 'full', autonomyLevel: 3 });

    expect(result.ok).toBe(true);
    expect(result.data?.template).toBe('full');
    expect(result.data?.autonomyLevel).toBe(3);
  });
});
