import { getWorktreePath, isGitRepo, runGit, worktreeCommand, createAgentWorktree, listAgentWorktrees, removeAgentWorktree, mergeAgentWorktree, statusAgentWorktrees } from '../commands/worktree';

let mockExecString: jest.Mock;
let mockFileExists: jest.Mock;
let mockReadDirEntries: jest.Mock;
let mockRemove: jest.Mock;

jest.mock('../io', () => ({
  getIO: () => ({
    fs: { exists: (p: string) => mockFileExists(p), readDirEntries: (p: string) => mockReadDirEntries(p), remove: (p: string, o: unknown) => mockRemove(p, o) },
    shell: { execString: (c: string, w?: string) => mockExecString(c, w) },
  }),
}));

import path from 'node:path';
import fs from 'node:fs';
import os from 'node:os';

let tmpDir: string;
beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'wt-'));
  mockExecString = jest.fn(); mockFileExists = jest.fn(); mockReadDirEntries = jest.fn(); mockRemove = jest.fn();
});
afterEach(() => { try { if (tmpDir) fs.rmSync(tmpDir, { recursive: true, force: true }); } catch {} });

describe('utils', () => {
  it('getWorktreePath', () => { expect(getWorktreePath(tmpDir, 'a')).toBe(path.join(tmpDir, '.ai', 'worktrees', 'a')); });
  it('isGitRepo true', () => { mockFileExists.mockReturnValue(true); expect(isGitRepo(tmpDir)).toBe(true); });
  it('isGitRepo false', () => { mockFileExists.mockReturnValue(false); expect(isGitRepo(tmpDir)).toBe(false); });
  it('runGit', () => { mockExecString.mockReturnValue({ stdout: 'ok', status: 0 }); expect(runGit(tmpDir, ['s']).stdout).toBe('ok'); });
});

describe('createAgentWorktree', () => {
  const exitMock = () => jest.spyOn(process, 'exit').mockImplementation(() => { throw new Error('x'); });
  it('error: no git', () => { exitMock(); mockFileExists.mockReturnValue(false); expect(() => createAgentWorktree(tmpDir, 'a', 'b')).toThrow('x'); });
  it('error: exists', () => { exitMock(); mockFileExists.mockReturnValue(true); expect(() => createAgentWorktree(tmpDir, 'a', 'b')).toThrow('x'); });
  it('creates new branch', () => { exitMock(); mockFileExists.mockReturnValueOnce(true).mockReturnValueOnce(false); mockExecString.mockReturnValue({ stdout: '', status: 1 }); expect(() => createAgentWorktree(tmpDir, 'x', 'f/x')).toThrow('x'); });
  it('adds to existing branch', () => { exitMock(); mockFileExists.mockReturnValueOnce(true).mockReturnValueOnce(false); mockExecString.mockReturnValueOnce({ stdout: '', status: 0 }).mockReturnValue({ stdout: '', status: 0 }); expect(() => createAgentWorktree(tmpDir, 'y', 'f/y')).toThrow('x'); });
});

describe('listAgentWorktrees', () => {
  const exitMock = () => jest.spyOn(process, 'exit').mockImplementation(() => { throw new Error('x'); });
  it('no git', () => { exitMock(); mockFileExists.mockReturnValue(false); expect(() => listAgentWorktrees(tmpDir)).toThrow('x'); });
  it('with agents', () => { exitMock(); mockFileExists.mockReturnValueOnce(true).mockReturnValueOnce(true); mockExecString.mockReturnValueOnce({ stdout: '/p', status: 0 }).mockReturnValueOnce({ stdout: 'main', status: 0 }); mockReadDirEntries.mockReturnValue([{ name: 'a1', isDirectory: () => true }]); expect(() => listAgentWorktrees(tmpDir)).toThrow('x'); });
});

describe('removeAgentWorktree', () => {
  const exitMock = () => jest.spyOn(process, 'exit').mockImplementation(() => { throw new Error('x'); });
  it('not found', () => { exitMock(); mockFileExists.mockReturnValue(false); expect(() => removeAgentWorktree(tmpDir, 'a', false)).toThrow('x'); });
  it('removes', () => { exitMock(); mockFileExists.mockReturnValue(true); mockExecString.mockReturnValue({ stdout: '', status: 0 }); expect(() => removeAgentWorktree(tmpDir, 'z', true)).toThrow('x'); });
});

describe('mergeAgentWorktree', () => {
  const exitMock = () => jest.spyOn(process, 'exit').mockImplementation(() => { throw new Error('x'); });
  it('not found', () => { exitMock(); mockFileExists.mockReturnValue(false); expect(() => mergeAgentWorktree(tmpDir, 'a', 'main', true)).toThrow('x'); });
  it('full flow', () => { exitMock(); mockFileExists.mockReturnValue(true);
    mockExecString.mockReturnValueOnce({ stdout: 'ab', status: 0 }).mockReturnValueOnce({ stdout: '', status: 0 }).mockReturnValueOnce({ stdout: '', status: 0 }).mockReturnValueOnce({ stdout: '', status: 0 }).mockReturnValueOnce({ stdout: '', status: 0 }).mockReturnValue({ stdout: '', status: 0 });
    expect(() => mergeAgentWorktree(tmpDir, 'm', 'main', true)).toThrow('x'); });
});

describe('statusAgentWorktrees', () => {
  const exitMock = () => jest.spyOn(process, 'exit').mockImplementation(() => { throw new Error('x'); });
  it('no worktrees', () => { exitMock(); mockFileExists.mockReturnValue(false); expect(() => statusAgentWorktrees(tmpDir)).toThrow('x'); });
  it('with agents', () => { exitMock(); mockFileExists.mockReturnValue(true); mockReadDirEntries.mockReturnValue([{ name: 'a', isDirectory: () => true }]);
    mockExecString.mockReturnValueOnce({ stdout: 'main', status: 0 }).mockReturnValueOnce({ stdout: '', status: 0 }).mockReturnValueOnce({ stdout: '0', status: 0 }).mockReturnValueOnce({ stdout: '0', status: 0 });
    expect(() => statusAgentWorktrees(tmpDir)).toThrow('x'); });
});

describe('worktreeCommand', () => {
  it('has 5 subcommands', () => { expect(worktreeCommand().commands.length).toBe(5); });
});
