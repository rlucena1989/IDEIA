import { hookCommand, hookContent, getGitHookDir } from '../hook';

jest.mock('../../io');

import { getIO } from '../../io';

const mockFs = { exists: jest.fn(), read: jest.fn(), write: jest.fn(), readDir: jest.fn(), mkDir: jest.fn(), remove: jest.fn(), copy: jest.fn() };
const mockShell = { exec: jest.fn(), execString: jest.fn() };

beforeEach(() => {
  jest.clearAllMocks();
  (getIO as jest.Mock).mockReturnValue({ fs: mockFs, shell: mockShell });
});

describe('hookContent', () => {
  it('deve conter conteudo do hook', () => {
    const content = hookContent();
    expect(content).toContain('AI-Devkit pre-commit hook');
    expect(content).toContain('ai-devkit verify');
    expect(content).toContain('SKIP_AI_VERIFY');
    expect(content).toContain('quality gate');
  });
});

describe('getGitHookDir', () => {
  it('deve usar git rev-parse quando disponivel', () => {
    mockShell.execString.mockReturnValue({ status: 0, stdout: '.git/hooks\n', stderr: '' });
    const dir = getGitHookDir('/project');
    expect(dir).toContain('hooks');
    expect(mockShell.execString).toHaveBeenCalledWith('git rev-parse --git-common-dir', '/project');
  });

  it('deve usar fallback .git/hooks quando git falha', () => {
    mockShell.execString.mockReturnValue({ status: 1, stdout: '', stderr: '' });
    const dir = getGitHookDir('/project');
    expect(dir).toContain('.git');
    expect(dir).toContain('hooks');
  });

  it('deve usar fallback .git/hooks quando excecao ocorre', () => {
    mockShell.execString.mockImplementation(() => { throw new Error('git not found'); });
    const dir = getGitHookDir('/project');
    expect(dir).toContain('.git');
    expect(dir).toContain('hooks');
  });
});

describe('hook command interface', () => {
  it('hookCommand should be defined', () => {
    expect(hookCommand).toBeDefined();
  });

  it('should return Command with subcommands', () => {
    const cmd = hookCommand();
    expect(cmd.name()).toBe('hook');
    const names = cmd.commands.map((c: { name: () => string }) => c.name());
    expect(names).toContain('install');
    expect(names).toContain('uninstall');
  });
});
