import { Command } from 'commander';
import { worktreeCommand, getWorktreePath, isGitRepo, runGit, createAgentWorktree, listAgentWorktrees, removeAgentWorktree, mergeAgentWorktree, statusAgentWorktrees } from '../worktree';

jest.mock('../../utils/output', () => ({
  printHeader: jest.fn(),
  printLine: jest.fn(),
  printResult: jest.fn(),
  finish: jest.fn(),
}));

const mockShellExecString = jest.fn();
const mockFsExists = jest.fn();
const mockFsReadDirEntries = jest.fn();
const mockFsRemove = jest.fn();
const mockFsMkDir = jest.fn();

jest.mock('../../io', () => ({
  getIO: jest.fn(() => ({
    fs: {
      mkDir: mockFsMkDir,
      exists: mockFsExists,
      read: jest.fn(),
      write: jest.fn(),
      readDirEntries: mockFsReadDirEntries,
      remove: mockFsRemove,
    },
    shell: {
      exec: jest.fn(() => ({ status: 0, stdout: '', stderr: '' })),
      execString: mockShellExecString,
    },
  })),
}));

describe('worktree utility functions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getWorktreePath', () => {
    it('should return the correct worktree path', () => {
      const result = getWorktreePath('/root', 'agent1');
      expect(result).toContain('worktrees');
      expect(result).toContain('agent1');
    });
  });

  describe('isGitRepo', () => {
    it('should return true when .git exists', () => {
      mockFsExists.mockReturnValue(true);
      expect(isGitRepo('/root')).toBe(true);
      expect(mockFsExists).toHaveBeenCalledWith(expect.stringContaining('.git'));
    });

    it('should return false when .git does not exist', () => {
      mockFsExists.mockReturnValue(false);
      expect(isGitRepo('/root')).toBe(false);
    });
  });

  describe('runGit', () => {
    it('should execute git command and return result', () => {
      mockShellExecString.mockReturnValue({ stdout: 'main', status: 0 });
      const result = runGit('/root', ['rev-parse', '--abbrev-ref', 'HEAD']);
      expect(mockShellExecString).toHaveBeenCalledWith('git rev-parse --abbrev-ref HEAD', '/root');
      expect(result.stdout).toBe('main');
      expect(result.exitCode).toBe(0);
    });
  });

  describe('createAgentWorktree', () => {
    it('should fail when not a git repo', () => {
      mockFsExists.mockReturnValue(false);
      createAgentWorktree('/root', 'agent1', 'feature/agent-agent1');
      const { printResult } = require('../../utils/output');
      expect(printResult).toHaveBeenCalledWith('create', false, 'Not a git repository');
    });

    it('should fail when worktree already exists', () => {
      mockFsExists.mockImplementation((p: string) => {
        if (p.includes('.git')) return true;
        if (p.includes('agent1')) return true;
        return false;
      });
      createAgentWorktree('/root', 'agent1', 'feature/agent-agent1');
      const { printResult } = require('../../utils/output');
      expect(printResult).toHaveBeenCalledWith('create', false, expect.stringContaining('already exists'));
    });
  });

  describe('listAgentWorktrees', () => {
    it('should handle non-git directory', () => {
      mockFsExists.mockReturnValue(false);
      listAgentWorktrees('/root');
      const { printLine } = require('../../utils/output');
      expect(printLine).toHaveBeenCalledWith('Not a git repository');
    });
  });

  describe('removeAgentWorktree', () => {
    it('should fail when worktree does not exist', () => {
      mockFsExists.mockReturnValue(false);
      removeAgentWorktree('/root', 'agent1', false);
      const { printResult } = require('../../utils/output');
      expect(printResult).toHaveBeenCalledWith('remove', false, expect.stringContaining('not found'));
    });
  });

  describe('mergeAgentWorktree', () => {
    it('should fail when worktree does not exist', () => {
      mockFsExists.mockReturnValue(false);
      mergeAgentWorktree('/root', 'agent1', 'main', false);
      const { printResult } = require('../../utils/output');
      expect(printResult).toHaveBeenCalledWith('merge', false, expect.stringContaining('not found'));
    });
  });

  describe('statusAgentWorktrees', () => {
    it('should report no worktrees when directory missing', () => {
      mockFsExists.mockReturnValue(false);
      statusAgentWorktrees('/root');
      const { printLine } = require('../../utils/output');
      expect(printLine).toHaveBeenCalledWith('No agent worktrees found');
    });
  });
});

describe('worktreeCommand', () => {
  let cmd: Command;

  beforeEach(() => {
    jest.clearAllMocks();
    cmd = worktreeCommand();
  });

  it('should create a command with name "worktree"', () => {
    expect(cmd.name()).toBe('worktree');
    expect(cmd.description()).toContain('Worktree');
  });

  it('should have subcommand "create" with --branch option', () => {
    const sub = cmd.commands.find(c => c.name() === 'create');
    expect(sub).toBeDefined();
    expect(sub?.description()).toContain('Cria');
    expect(sub?.options.some(o => o.attributeName() === 'branch')).toBe(true);
  });

  it('should have subcommand "list"', () => {
    const sub = cmd.commands.find(c => c.name() === 'list');
    expect(sub).toBeDefined();
    expect(sub?.description()).toContain('Lista');
  });

  it('should have subcommand "remove" with --force option', () => {
    const sub = cmd.commands.find(c => c.name() === 'remove');
    expect(sub).toBeDefined();
    expect(sub?.description()).toContain('Remove');
    expect(sub?.options.some(o => o.attributeName() === 'force')).toBe(true);
  });

  it('should have subcommand "merge" with --target and --no-push options', () => {
    const sub = cmd.commands.find(c => c.name() === 'merge');
    expect(sub).toBeDefined();
    expect(sub?.description()).toContain('Merge');
    const optNames = sub?.options.map(o => o.attributeName());
    expect(optNames).toContain('target');
    expect(optNames).toContain('push');
  });

  it('should have subcommand "status"', () => {
    const sub = cmd.commands.find(c => c.name() === 'status');
    expect(sub).toBeDefined();
    expect(sub?.description()).toContain('Status');
  });

  it('should have exactly 5 subcommands', () => {
    const names = cmd.commands.map(c => c.name()).sort();
    expect(names).toEqual(['create', 'list', 'merge', 'remove', 'status']);
  });
});
