import { Command } from 'commander';
import { taskRunCommand } from '../task-run';

jest.mock('../../utils/output', () => ({
  printHeader: jest.fn(),
  printLine: jest.fn(),
  printResult: jest.fn(),
  finish: jest.fn(),
}));

const taskRunMockExists = jest.fn();
const taskRunMockRead = jest.fn(() => '');
const taskRunMockWrite = jest.fn();
const taskRunMockMkDir = jest.fn();

jest.mock('../../io', () => ({
  getIO: jest.fn(() => ({
    fs: {
      mkDir: taskRunMockMkDir,
      exists: taskRunMockExists,
      read: taskRunMockRead,
      write: taskRunMockWrite,
      readDirEntries: jest.fn(() => []),
      remove: jest.fn(),
      copy: jest.fn(),
    },
  })),
}));

jest.mock('../../runtime/agent-runtime', () => ({
  createSession: jest.fn(() => ({
    sessionId: 'test-session-123',
    taskId: 'TASK-001',
    status: 'created',
    phase: 'phase-1',
    step: 0,
    totalSteps: 3,
    context: {},
    startedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    checkpoint: { path: '', hash: '', timestamp: '', filesChanged: [] },
    history: [],
  })),
  logAction: jest.fn(),
  completeSession: jest.fn(),
  failSession: jest.fn(),
  listSessionIds: jest.fn(() => []),
  loadState: jest.fn(() => null),
  resumeSession: jest.fn(),
  setCheckpoint: jest.fn(),
}));

jest.mock('../../runtime/agent-security', () => ({
  validateAction: jest.fn(() => ({
    allowed: true,
    requiresApproval: false,
    riskLevel: 'low',
  })),
}));

describe('taskRunCommand', () => {
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
    cmd = taskRunCommand();
  });

  it('should create a command with name "task-run"', () => {
    expect(cmd.name()).toBe('task-run');
    expect(cmd.description()).toContain('backlog');
  });

  it('should have subcommand "next"', () => {
    const sub = cmd.commands.find(c => c.name() === 'next');
    expect(sub).toBeDefined();
    expect(sub?.description()).toContain('proxima');
  });

  it('should have subcommand "list"', () => {
    const sub = cmd.commands.find(c => c.name() === 'list');
    expect(sub).toBeDefined();
    expect(sub?.description()).toContain('Lista');
  });

  it('should have subcommand "sessions"', () => {
    const sub = cmd.commands.find(c => c.name() === 'sessions');
    expect(sub).toBeDefined();
    expect(sub?.description()).toContain('sessoes');
  });

  it('should have exactly 3 subcommands', () => {
    const names = cmd.commands.map(c => c.name()).sort();
    expect(names).toEqual(['list', 'next', 'sessions']);
  });

  it('should have next command with --dry-run and --apply options', () => {
    const sub = cmd.commands.find(c => c.name() === 'next')!;
    const opts = sub.options.map(o => o.attributeName());
    expect(opts).toContain('dryRun');
    expect(opts).toContain('apply');
  });

  it('should handle next command when backlog file does not exist', async () => {
    taskRunMockExists.mockReturnValue(false);

    const sub = cmd.commands.find(c => c.name() === 'next')!;
    await sub.parseAsync(['node', 'test']);

    const { printResult } = require('../../utils/output');
    expect(printResult).toHaveBeenCalledWith('Erro', false, expect.stringContaining('Backlog'));
  });

  it('should handle next command with --dry-run', async () => {
    taskRunMockExists.mockReturnValue(true);
    taskRunMockRead.mockReturnValue([
      'phases:',
      '  - id: p1',
      '    name: Phase 1',
      '    tasks:',
      '      - id: T1',
      '        title: Test Task',
      '        status: pending',
      '        priority: high',
      '        objective: Test',
      '        dependencies: []',
    ].join('\n'));

    const sub = cmd.commands.find(c => c.name() === 'next')!;
    await sub.parseAsync(['node', 'test', '--dry-run']);

    const { printLine } = require('../../utils/output');
    expect(printLine).toHaveBeenCalledWith(expect.stringContaining('[dry-run]'));
  });

  it('should handle next command with --apply', async () => {
    taskRunMockExists.mockReturnValue(true);
    taskRunMockRead.mockReturnValue([
      'phases:',
      '  - id: p1',
      '    name: Phase 1',
      '    tasks:',
      '      - id: T1',
      '        title: Test Task',
      '        status: pending',
      '        priority: high',
      '        objective: Test',
      '        dependencies: []',
    ].join('\n'));

    const sub = cmd.commands.find(c => c.name() === 'next')!;
    await sub.parseAsync(['node', 'test', '--apply']);

    const { createSession } = require('../../runtime/agent-runtime');
    expect(createSession).toHaveBeenCalled();
  });

  it('should handle sessions command when no sessions exist', () => {
    const { listSessionIds } = require('../../runtime/agent-runtime');
    listSessionIds.mockReturnValue([]);

    const sub = cmd.commands.find(c => c.name() === 'sessions')!;
    sub.parse(['node', 'test']);

    const { printLine } = require('../../utils/output');
    expect(printLine).toHaveBeenCalledWith('Nenhuma sessao encontrada.');
  });

  it('should handle sessions command with existing sessions', () => {
    const { listSessionIds, loadState } = require('../../runtime/agent-runtime');
    listSessionIds.mockReturnValue(['session-1']);
    loadState.mockReturnValue({
      sessionId: 'session-1',
      taskId: 'TASK-001',
      status: 'completed',
      phase: 'phase-1',
      step: 3,
      totalSteps: 3,
      context: {},
      startedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      checkpoint: { path: '', hash: '', timestamp: '', filesChanged: [] },
      history: [],
    });

    const sub = cmd.commands.find(c => c.name() === 'sessions')!;
    sub.parse(['node', 'test']);

    const { printLine } = require('../../utils/output');
    expect(printLine).toHaveBeenCalledWith(expect.stringContaining('session-1'));
  });

  it('should handle list command when file does not exist', () => {
    taskRunMockExists.mockReturnValue(false);

    const sub = cmd.commands.find(c => c.name() === 'list')!;
    sub.parse(['node', 'test']);

    const { printResult } = require('../../utils/output');
    expect(printResult).toHaveBeenCalledWith('Erro', false, 'Backlog nao encontrado');
  });
});
