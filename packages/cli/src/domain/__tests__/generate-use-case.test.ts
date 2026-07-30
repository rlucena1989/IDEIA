import { GenerateUseCase, type GenerateOutput } from '../generate-use-case';

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

describe('GenerateUseCase', () => {
  let useCase: GenerateUseCase;

  beforeEach(() => {
    jest.clearAllMocks();
    useCase = new GenerateUseCase();
  });

  it('should generate a use-case file', () => {
    mockFs.exists.mockReturnValue(false);
    mockFs.cwd.mockReturnValue('/test/project');

    const result = useCase.execute('use-case', 'myFeature');

    expect(result.ok).toBe(true);
    expect(result.code).toBe(0);
    expect(result.data?.template).toBe('use-case');
    expect(result.data?.name).toBe('myFeature');
    expect(mockFs.ensureDir).toHaveBeenCalledWith('/test/project/src/domain');
    expect(mockFs.write).toHaveBeenCalledWith(
      '/test/project/src/domain/myFeature.ts',
      expect.stringContaining('class MyFeatureUseCase'),
    );
    expect((result.data as GenerateOutput).files).toHaveLength(1);
    expect((result.data as GenerateOutput).files[0].path).toBe('/test/project/src/domain/myFeature.ts');
  });

  it('should generate a command file', () => {
    mockFs.exists.mockReturnValue(false);
    mockFs.cwd.mockReturnValue('/test/project');

    const result = useCase.execute('command', 'build');

    expect(result.ok).toBe(true);
    expect(mockFs.write).toHaveBeenCalledWith(
      '/test/project/src/commands/build.ts',
      expect.stringContaining('buildCommand'),
    );
  });

  it('should generate a service file', () => {
    mockFs.exists.mockReturnValue(false);

    const result = useCase.execute('service', 'AuthService');

    expect(result.ok).toBe(true);
    expect(mockFs.write).toHaveBeenCalledWith(
      expect.stringContaining('AuthService.ts'),
      expect.stringContaining('class AuthService'),
    );
  });

  it('should reject when file exists without force', () => {
    mockFs.exists.mockReturnValue(true);

    const result = useCase.execute('use-case', 'Existing');

    expect(result.ok).toBe(false);
    expect(result.code).toBe(1);
    expect(result.message).toContain('already exists');
    expect(mockFs.write).not.toHaveBeenCalled();
  });

  it('should overwrite when force is set', () => {
    mockFs.exists.mockReturnValue(true);
    mockFs.cwd.mockReturnValue('/test/project');

    const result = useCase.execute('use-case', 'Forced', { force: true });

    expect(result.ok).toBe(true);
    expect(mockFs.write).toHaveBeenCalled();
  });

  it('should skip IO in dryRun mode', () => {
    mockFs.exists.mockReturnValue(false);

    const result = useCase.execute('use-case', 'DryRun', { dryRun: true });

    expect(result.ok).toBe(true);
    expect(mockFs.write).not.toHaveBeenCalled();
    expect(mockFs.ensureDir).not.toHaveBeenCalled();
    expect((result.data as GenerateOutput).files).toHaveLength(0);
  });

  it('should use custom outputDir when provided', () => {
    mockFs.exists.mockReturnValue(false);

    const result = useCase.execute('test', 'custom', { outputDir: '/custom/dir' });

    expect(result.ok).toBe(true);
    expect(mockFs.write).toHaveBeenCalledWith('/custom/dir/custom.ts', expect.any(String));
  });

  it('should include extra variables in template', () => {
    mockFs.exists.mockReturnValue(false);
    mockFs.cwd.mockReturnValue('/test/project');

    const result = useCase.execute('use-case', 'Extended', { variables: { role: 'admin' } });

    expect(result.ok).toBe(true);
    expect(mockFs.write).toHaveBeenCalledWith(
      expect.any(String),
      expect.stringContaining('role'),
    );
  });

  it('should fail validation with empty name', () => {
    const result = useCase.execute('use-case', '');

    expect(result.ok).toBe(false);
    expect(result.code).toBe(1);
    expect(result.message).toContain('Invalid generate request');
  });
});
