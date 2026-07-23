import { prepareRelease } from '../release/preparer';

jest.mock('node:child_process', () => ({
  execFileSync: jest.fn(),
}));
const mockExecFileSync = jest.requireMock('node:child_process').execFileSync;

jest.mock('node:fs', () => ({
  existsSync: jest.fn(),
  readFileSync: jest.fn(),
  writeFileSync: jest.fn(),
  readdirSync: jest.fn(),
  renameSync: jest.fn(),
  mkdirSync: jest.fn(),
}));
jest.mock('node:path', () => ({
  join: (...args: string[]) => args.join('/').replace(/\\/g, '/'),
  resolve: (...args: string[]) => args.join('/').replace(/\\/g, '/'),
  dirname: (p: string) => p.split('/').slice(0, -1).join('/'),
}));

const mockFs = jest.requireMock('node:fs');

beforeEach(() => {
  jest.clearAllMocks();
  mockFs.existsSync.mockReturnValue(false);
});

describe('prepareRelease', () => {
  it('deve preparar release dry-run sem modificar arquivos', () => {
    mockExecFileSync.mockImplementation((cmd: string) => {
      if (cmd.includes('git tag')) return 'v1.0.0\nv0.9.0\n';
      if (cmd.includes('git log')) return 'feat: feature x\nfix: bug y\n';
      return '';
    });
    const result = prepareRelease('2.0.0', true);
    expect(result.version).toBe('2.0.0');
    expect(result.tag).toBe('v2.0.0');
    expect(result.previousVersion).toBe('1.0.0');
    expect(result.commitsSinceLast).toBe(2);
    expect(mockFs.writeFileSync).not.toHaveBeenCalled();
  });

  it('deve preparar release sem tags anteriores', () => {
    mockExecFileSync.mockImplementation((cmd: string) => {
      if (cmd.includes('git tag')) throw new Error('no tags');
      if (cmd.includes('git log')) return 'feat: first commit\n';
      return '';
    });
    const result = prepareRelease('1.0.0', true);
    expect(result.previousVersion).toBe('0.0.0');
    expect(result.commitsSinceLast).toBe(1);
  });

  it('deve escrever versao no package.json raiz no modo nao-dry-run', () => {
    mockFs.existsSync.mockReturnValue(true);
    mockFs.readFileSync.mockReturnValue(JSON.stringify({ version: '0.0.0', name: 'test' }));
    mockFs.readdirSync.mockReturnValue([]);
    mockExecFileSync.mockReturnValue('');
    prepareRelease('3.0.0', false);
    expect(mockFs.writeFileSync).toHaveBeenCalledWith(
      expect.stringContaining('package.json'),
      expect.stringContaining('"version": "3.0.0"'),
    );
  });

  it('deve escrever versao no package.json raiz', () => {
    mockFs.existsSync.mockImplementation((p: string) => p.includes('package.json') || p.includes('CHANGELOG.md'));
    mockFs.readFileSync.mockImplementation((p: string) => {
      if (p.includes('CHANGELOG.md')) return '# Changelog\n';
      return JSON.stringify({ version: '0.0.0', name: 'test' });
    });
    mockFs.readdirSync.mockReturnValue([]);
    mockExecFileSync.mockReturnValue('');
    prepareRelease('4.0.0', false);
    expect(mockFs.writeFileSync).toHaveBeenCalledWith(
      expect.stringContaining('package.json'),
      expect.stringContaining('"version": "4.0.0"'),
    );
  });

  it('deve adicionar cabecalho ao CHANGELOG.md existente', () => {
    mockFs.existsSync.mockImplementation((p: string) => p.includes('CHANGELOG.md') || p.includes('package.json'));
    mockFs.readFileSync.mockImplementation((p: string) => {
      if (p.includes('CHANGELOG.md')) return '# Changelog\n\nOld content\n';
      return JSON.stringify({ version: '0.0.0' });
    });
    mockFs.readdirSync.mockReturnValue([]);
    mockExecFileSync.mockReturnValue('');
    prepareRelease('5.0.0', false);
    const writes = mockFs.writeFileSync.mock.calls.filter((c: string[]) => c[0].includes('CHANGELOG.md'));
    expect(writes.length).toBeGreaterThan(0);
    expect(writes[0][1]).toContain('v5.0.0');
    expect(writes[0][1]).toContain('Old content');
  });

  it('deve criar CHANGELOG.md se nao existir', () => {
    mockFs.existsSync.mockReturnValue(false);
    mockExecFileSync.mockReturnValue('');
    prepareRelease('6.0.0', false);
    const writes = mockFs.writeFileSync.mock.calls.filter((c: string[]) => c[0].includes('CHANGELOG.md'));
    expect(writes.length).toBeGreaterThan(0);
    expect(writes[0][1]).toContain('# Changelog');
  });

  it('deve executar git add/commit/tag no modo nao-dry-run', () => {
    mockFs.existsSync.mockReturnValue(true);
    mockFs.readFileSync.mockReturnValue(JSON.stringify({ version: '1.0.0' }));
    mockFs.readdirSync.mockReturnValue([]);
    mockExecFileSync.mockReturnValue('');
    prepareRelease('2.0.0', false);
    const gitCalls = mockExecFileSync.mock.calls.filter((c: string[]) => c[0].includes('git'));
    expect(gitCalls.length).toBeGreaterThanOrEqual(3);
  });
});
