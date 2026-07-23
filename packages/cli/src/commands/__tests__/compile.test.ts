import { compileCommand, compileAllAction, compileListAction, compileSingleAction } from '../compile';
import { printHeader, printLine, printResult, finish } from '../../utils/output';

jest.mock('../../utils/output');
jest.mock('../../io');
jest.mock('../compile-utils');

import { getIO } from '../../io';
jest.mock('../compile-utils', () => {
  const T = ['claude', 'cursor'] as const;
  return {
    TARGETS: T,
    TARGET_PATHS: { claude: 'CLAUDE.md', cursor: '.cursor/rules/test.mdc' } as Record<string, string>,
    COMPILERS: { claude: jest.fn().mockReturnValue('# Rules'), cursor: jest.fn().mockReturnValue('cursor rules') } as Record<string, jest.Mock>,
    readManifest: jest.fn().mockReturnValue({}),
    readLaws: jest.fn().mockReturnValue({ rules: [{ id: 'rule1' }] }),
    readGlobalRules: jest.fn().mockReturnValue([]),
    readPolicies: jest.fn().mockReturnValue([]),
    getPathScopedOutputs: jest.fn().mockReturnValue([]),
    getBaseRules: jest.fn(),
    getProjectName: jest.fn(),
    getFramework: jest.fn(),
    getCoverageMin: jest.fn(),
    startWatch: jest.fn(),
    compileClaude: jest.fn(),
    compileCursor: jest.fn(),
    compileCopilot: jest.fn(),
    compileWindsurf: jest.fn(),
    compileCline: jest.fn(),
    compileGemini: jest.fn(),
    compileContinue: jest.fn(),
    compileZed: jest.fn(),
    compileAmazonQ: jest.fn(),
    compileCodex: jest.fn(),
    compileAider: jest.fn(),
    compileCursorMdc: jest.fn(),
    compileGithubActions: jest.fn(),
    LawsConfig: class {},
    ProjectManifest: class {},
    Target: String,
  };
});

import { TARGETS, TARGET_PATHS, COMPILERS, readManifest, readLaws } from '../compile-utils';

const mockFs = { exists: jest.fn(), read: jest.fn(), write: jest.fn(), readDir: jest.fn(), mkDir: jest.fn(), remove: jest.fn(), copy: jest.fn() };

beforeEach(() => {
  jest.clearAllMocks();
  (getIO as jest.Mock).mockReturnValue({ fs: mockFs, shell: { exec: jest.fn(), execString: jest.fn() }, http: { post: jest.fn(), get: jest.fn() } });
  (finish as jest.Mock).mockImplementation(() => {});
});

describe('compileAllAction', () => {
  it('deve compilar todos os targets', () => {
    compileAllAction({});
    expect(readManifest).toHaveBeenCalled();
    expect(readLaws).toHaveBeenCalled();
    expect(mockFs.mkDir).toHaveBeenCalled();
    expect(mockFs.write).toHaveBeenCalled();
    expect(finish).toHaveBeenCalledWith(expect.objectContaining({ ok: true }));
  });

  it('deve executar dry-run sem escrever', () => {
    compileAllAction({ dryRun: true });
    expect(mockFs.mkDir).not.toHaveBeenCalled();
    expect(mockFs.write).not.toHaveBeenCalled();
    expect(printLine).toHaveBeenCalledWith(expect.stringContaining('[DRY-RUN]'));
  });
});

describe('compileListAction', () => {
  it('deve listar formatos', () => {
    compileListAction();
    expect(printHeader).toHaveBeenCalledWith(expect.stringContaining('Formatos'));
  });
});

describe('compileSingleAction', () => {
  it('deve compilar target especifico', () => {
    compileSingleAction('claude', {});
    expect(COMPILERS.claude).toHaveBeenCalled();
    expect(finish).toHaveBeenCalledWith(expect.objectContaining({ ok: true }));
  });

  it('deve executar dry-run para target', () => {
    compileSingleAction('cursor', { dryRun: true });
    expect(mockFs.write).not.toHaveBeenCalled();
  });
});

describe('compileCommand', () => {
  it('should be defined', () => {
    expect(compileCommand).toBeDefined();
  });

  it('should return Command with subcommands', () => {
    const cmd = compileCommand();
    expect(cmd.name()).toBe('compile');
    const names = cmd.commands.map((c: { name: () => string }) => c.name());
    expect(names).toContain('all');
    expect(names).toContain('list');
  });
});
