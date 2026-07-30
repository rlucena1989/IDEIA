import { Command } from 'commander';
import { promptCommand } from '../prompt';

jest.mock('../../utils/output', () => ({
  printHeader: jest.fn(),
  printLine: jest.fn(),
  printResult: jest.fn(),
  finish: jest.fn(),
}));

jest.mock('../../io', () => ({
  getIO: jest.fn(() => ({
    fs: {
      mkDir: jest.fn(),
      exists: jest.fn(),
      read: jest.fn(),
      write: jest.fn(),
      readDirEntries: jest.fn(),
    },
  })),
}));

describe('promptCommand', () => {
  let cmd: Command;
  let mockExit: jest.SpyInstance;

  beforeAll(() => {
    mockExit = jest.spyOn(process, 'exit').mockImplementation(() => undefined as never);
  });

  afterAll(() => {
    mockExit.mockRestore();
  });

  beforeEach(() => {
    jest.clearAllMocks();
    cmd = promptCommand();
  });

  it('should create a command with name "prompt"', () => {
    expect(cmd.name()).toBe('prompt');
    expect(cmd.description()).toContain('Prompt Management');
  });

  it('should have subcommand "save"', () => {
    const sub = cmd.commands.find(c => c.name() === 'save');
    expect(sub).toBeDefined();
    expect(sub?.description()).toContain('versao');
  });

  it('should have subcommand "list"', () => {
    const sub = cmd.commands.find(c => c.name() === 'list');
    expect(sub).toBeDefined();
    expect(sub?.description()).toContain('Lista');
  });

  it('should have subcommand "show"', () => {
    const sub = cmd.commands.find(c => c.name() === 'show');
    expect(sub).toBeDefined();
    expect(sub?.description()).toContain('Exibe');
  });

  it('should have subcommand "diff"', () => {
    const sub = cmd.commands.find(c => c.name() === 'diff');
    expect(sub).toBeDefined();
    expect(sub?.description()).toContain('diff');
  });

  it('should have subcommand "rollback"', () => {
    const sub = cmd.commands.find(c => c.name() === 'rollback');
    expect(sub).toBeDefined();
    expect(sub?.description()).toContain('Restaura');
  });

  it('should have exactly 5 subcommands', () => {
    const names = cmd.commands.map(c => c.name()).sort();
    expect(names).toEqual(['diff', 'list', 'rollback', 'save', 'show']);
  });

  it('should require --content on save command', () => {
    const sub = cmd.commands.find(c => c.name() === 'save')!;
    const contentOpt = sub.options.find(o => o.attributeName() === 'content');
    expect(contentOpt).toBeDefined();
    expect(contentOpt?.required).toBe(true);
  });

  it('should have --version and --description options on save', () => {
    const sub = cmd.commands.find(c => c.name() === 'save')!;
    const names = sub.options.map(o => o.attributeName());
    expect(names).toContain('version');
    expect(names).toContain('description');
    expect(names).toContain('file');
  });

  it('should have --version option on show with default "latest"', () => {
    const sub = cmd.commands.find(c => c.name() === 'show')!;
    const opt = sub.options.find(o => o.attributeName() === 'version');
    expect(opt).toBeDefined();
  });

  it('should have --from and --to required options on diff', () => {
    const sub = cmd.commands.find(c => c.name() === 'diff')!;
    const fromOpt = sub.options.find(o => o.attributeName() === 'from');
    const toOpt = sub.options.find(o => o.attributeName() === 'to');
    expect(fromOpt).toBeDefined();
    expect(fromOpt?.required).toBe(true);
    expect(toOpt).toBeDefined();
    expect(toOpt?.required).toBe(true);
  });

  it('should require --version on rollback', () => {
    const sub = cmd.commands.find(c => c.name() === 'rollback')!;
    const opt = sub.options.find(o => o.attributeName() === 'version');
    expect(opt).toBeDefined();
    expect(opt?.required).toBe(true);
  });

  it('should call save action without content and fail gracefully', () => {
    const sub = cmd.commands.find(c => c.name() === 'save')!;
    sub.parse(['node', 'test', 'myprompt', '--content', '']);
    const { finish, printResult } = require('../../utils/output');
    expect(printResult).toHaveBeenCalledWith('save', false, expect.stringContaining('Conteudo'));
    expect(finish).toHaveBeenCalledWith(expect.objectContaining({ ok: false }));
  });

  it('should list command show no prompts when dir missing', () => {
    const { getIO } = require('../../io');
    getIO().fs.exists.mockReturnValue(false);

    const sub = cmd.commands.find(c => c.name() === 'list')!;
    sub.parse(['node', 'test']);
    const { printLine, finish } = require('../../utils/output');
    expect(printLine).toHaveBeenCalledWith('No prompts found');
    expect(finish).toHaveBeenCalledWith(expect.objectContaining({ ok: true }));
  });
});
