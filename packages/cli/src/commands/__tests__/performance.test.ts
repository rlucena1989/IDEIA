import { Command } from 'commander';
import { performanceCommand } from '../performance';

jest.mock('../../utils/output', () => ({
  printHeader: jest.fn(),
  printLine: jest.fn(),
  printResult: jest.fn(),
  finish: jest.fn(),
  printSummary: jest.fn(),
}));

const perfFsFiles = new Map<string, string>();
const perfMockExists = jest.fn((p: string) => perfFsFiles.has(p));
const perfMockRead = jest.fn((p: string) => perfFsFiles.get(p) || '');
const perfMockWrite = jest.fn((p: string, c: string) => { perfFsFiles.set(p, c); });
const perfMockAppend = jest.fn((p: string, c: string) => {
  const existing = perfFsFiles.get(p) || '';
  perfFsFiles.set(p, existing + c);
});

jest.mock('../../io', () => ({
  getIO: jest.fn(() => ({
    fs: {
      _files: perfFsFiles,
      exists: perfMockExists,
      read: perfMockRead,
      write: perfMockWrite,
      append: perfMockAppend,
      mkDir: jest.fn(),
      readDir: jest.fn(() => ['dist']),
      readDirEntries: jest.fn((dir: string) => {
        if (dir.endsWith('dist')) {
          return [{ name: 'bundle.js', isDirectory: () => false, isFile: () => true }];
        }
        return [];
      }),
      stat: jest.fn(() => ({ mtimeMs: Date.now(), size: 50000, isDirectory: () => false })),
      remove: jest.fn(),
      copy: jest.fn(),
      ensureDir: jest.fn(),
      cwd: () => process.cwd(),
    },
    shell: { exec: jest.fn(), execString: jest.fn() },
    http: { get: jest.fn(), post: jest.fn() },
  })),
}));

describe('performanceCommand', () => {
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
    cmd = performanceCommand();
  });

  it('should create a command with name "performance"', () => {
    expect(cmd.name()).toBe('performance');
    expect(cmd.description()).toContain('Performance budget');
  });

  it('should have subcommand "budget"', () => {
    const sub = cmd.commands.find(c => c.name() === 'budget');
    expect(sub).toBeDefined();
    expect(sub?.description()).toContain('budget');
  });

  it('should have exactly 1 subcommand', () => {
    expect(cmd.commands.length).toBe(1);
  });

  it('should handle budget init action', () => {
    const sub = cmd.commands.find(c => c.name() === 'budget')!;
    sub.parse(['node', 'test', 'init']);

    const { printHeader, printResult, finish } = require('../../utils/output');
    expect(printHeader).toHaveBeenCalledWith('Performance Budget Init');
    expect(printResult).toHaveBeenCalledWith('Configuracao criada', true, expect.any(String));
    expect(finish).toHaveBeenCalledWith(expect.objectContaining({
      checkpoint: 'performance_budget_init',
      ok: true,
    }));
  });

  it('should handle budget check action', () => {
    const { getIO } = require('../../io');
    const budget = {
      budget: {
        bundleSize: { max: 500, unit: 'kb' },
        memoryUsage: { max: 512, unit: 'mb' },
      },
      alerts: { onExceed: 'warn' },
    };
    perfFsFiles.set(
      require('path').join(process.cwd(), '.ai/performance/budget.yaml'),
      JSON.stringify(budget),
    );

    const sub = cmd.commands.find(c => c.name() === 'budget')!;
    sub.parse(['node', 'test', 'check']);

    const { printHeader, finish } = require('../../utils/output');
    expect(printHeader).toHaveBeenCalledWith('Performance Budget Check');
    expect(finish).toHaveBeenCalledWith(expect.objectContaining({
      checkpoint: 'performance_budget_check',
    }));
  });

  it('should handle budget report action with no history', () => {
    const { getIO } = require('../../io');
    getIO().fs.exists.mockReturnValue(false);

    const sub = cmd.commands.find(c => c.name() === 'budget')!;
    sub.parse(['node', 'test', 'report']);

    const { printLine } = require('../../utils/output');
    expect(printLine).toHaveBeenCalledWith(expect.stringContaining('historico'));
  });

  it('should handle budget report action with history', () => {
    const { getIO } = require('../../io');
    getIO().fs.exists.mockReturnValue(true);
    getIO().fs.read.mockReturnValue(
      JSON.stringify({ date: '2024-01-01', results: [], allPassed: true }) + '\n' +
      JSON.stringify({ date: '2024-01-02', results: [], allPassed: true }) + '\n',
    );

    const sub = cmd.commands.find(c => c.name() === 'budget')!;
    sub.parse(['node', 'test', 'report']);

    const { printLine } = require('../../utils/output');
    expect(printLine).toHaveBeenCalledWith(expect.stringContaining('checks'));
  });

  it('should handle unknown budget action', () => {
    const sub = cmd.commands.find(c => c.name() === 'budget')!;
    sub.parse(['node', 'test', 'invalid-action']);

    const { printResult } = require('../../utils/output');
    expect(printResult).toHaveBeenCalledWith('Erro', false, expect.stringContaining('desconhecida'));
  });

  it('should have budget command with action argument', () => {
    const sub = cmd.commands.find(c => c.name() === 'budget')!;
    expect(sub).toBeDefined();
  });
});
