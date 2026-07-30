import { Command } from 'commander';
import { testAutonomyCommand } from '../test-autonomy';

jest.mock('node:fs', () => ({
  existsSync: jest.fn(),
  readFileSync: jest.fn(),
  writeFileSync: jest.fn(),
  mkdirSync: jest.fn(),
  readdirSync: jest.fn(() => []),
  rmSync: jest.fn(),
}));

jest.mock('node:child_process', () => ({
  execFileSync: jest.fn(),
}));

jest.mock('../../quality/test-validator', () => ({
  classifyTest: jest.fn(() => ({
    testId: 'test.ts',
    filePath: '/test.ts',
    score: 8,
    maxScore: 10,
    classification: 'valid',
    signals: {
      assertionReal: 2, sensitiveToChange: 2, semanticValue: 2,
      deterministic: 2, isolated: 2, mockRobustness: 2,
      usefulCoverage: 2, completeness: 2,
    },
    blockingFlags: [],
  })),
  evaluateDirectory: jest.fn(() => []),
  summarizeResults: jest.fn(() => ({ total: 0, valid: 0, incomplete: 0, invalid: 0, averageScore: 0 })),
  MAX_SCORE: 10,
}));

describe('testAutonomyCommand', () => {
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
    cmd = testAutonomyCommand();
  });

  it('should create a command with name "test-autonomy"', () => {
    expect(cmd.name()).toBe('test-autonomy');
    expect(cmd.description()).toContain('auton');
  });

  it('should have subcommand "run"', () => {
    const sub = cmd.commands.find(c => c.name() === 'run');
    expect(sub).toBeDefined();
    expect(sub?.description()).toContain('pipeline');
  });

  it('should have subcommand "status"', () => {
    const sub = cmd.commands.find(c => c.name() === 'status');
    expect(sub).toBeDefined();
    expect(sub?.description()).toContain('estado');
  });

  it('should have subcommand "gap-prioritize"', () => {
    const sub = cmd.commands.find(c => c.name() === 'gap-prioritize');
    expect(sub).toBeDefined();
    expect(sub?.description()).toContain('gaps');
  });

  it('should have subcommand "validate"', () => {
    const sub = cmd.commands.find(c => c.name() === 'validate');
    expect(sub).toBeDefined();
    expect(sub?.description()).toContain('Classifica');
  });

  it('should have exactly 4 subcommands', () => {
    const names = cmd.commands.map(c => c.name()).sort();
    expect(names).toEqual(['gap-prioritize', 'run', 'status', 'validate']);
  });

  it('should have run command with --target, --limit, --iterations options', () => {
    const sub = cmd.commands.find(c => c.name() === 'run')!;
    const opts = sub.options.map(o => o.attributeName());
    expect(opts).toContain('target');
    expect(opts).toContain('limit');
    expect(opts).toContain('iterations');
  });

  it('should handle status command when state file does not exist', () => {
    const fs = require('node:fs');
    fs.existsSync.mockReturnValue(false);

    const sub = cmd.commands.find(c => c.name() === 'status')!;
    sub.parse(['node', 'test']);

    expect(fs.existsSync).toHaveBeenCalled();
  });

  it('should handle status command when state file exists', () => {
    const fs = require('node:fs');
    fs.existsSync.mockReturnValue(true);
    fs.readFileSync.mockReturnValue(JSON.stringify({
      lastTarget: 'test.ts',
      timestamp: '2024-01-01T00:00:00.000Z',
      testsGenerated: 5,
      passing: 3,
    }));

    const sub = cmd.commands.find(c => c.name() === 'status')!;
    sub.parse(['node', 'test']);

    expect(fs.readFileSync).toHaveBeenCalled();
  });

  it('should have gap-prioritize command with --limit and --all options', () => {
    const sub = cmd.commands.find(c => c.name() === 'gap-prioritize')!;
    const opts = sub.options.map(o => o.attributeName());
    expect(opts).toContain('limit');
    expect(opts).toContain('all');
  });

  it('should handle gap-prioritize command', () => {
    const fs = require('node:fs');
    fs.existsSync.mockReturnValue(false);

    const sub = cmd.commands.find(c => c.name() === 'gap-prioritize')!;
    sub.parse(['node', 'test', '--limit', '5']);

    expect(fs.existsSync).toHaveBeenCalled();
  });

  it('should have validate command with --file, --dir, --json options', () => {
    const sub = cmd.commands.find(c => c.name() === 'validate')!;
    const opts = sub.options.map(o => o.attributeName());
    expect(opts).toContain('file');
    expect(opts).toContain('dir');
    expect(opts).toContain('json');
  });

  it('should handle validate command with --file option', () => {
    const fs = require('node:fs');
    fs.existsSync.mockReturnValue(true);

    const sub = cmd.commands.find(c => c.name() === 'validate')!;
    sub.parse(['node', 'test', '--file', 'test.ts']);

    const { classifyTest } = require('../../quality/test-validator');
    expect(classifyTest).toHaveBeenCalledWith('test.ts');
  });

  it('should handle validate command with --file that does not exist', () => {
    const fs = require('node:fs');
    fs.existsSync.mockReturnValue(false);

    const sub = cmd.commands.find(c => c.name() === 'validate')!;
    sub.parse(['node', 'test', '--file', 'nonexistent.ts']);

    const { classifyTest } = require('../../quality/test-validator');
    expect(classifyTest).not.toHaveBeenCalled();
  });

  it('should handle validate command with --json flag', () => {
    const fs = require('node:fs');
    fs.existsSync.mockReturnValue(true);

    const sub = cmd.commands.find(c => c.name() === 'validate')!;
    sub.parse(['node', 'test', '--file', 'test.ts', '--json']);

    const { classifyTest } = require('../../quality/test-validator');
    expect(classifyTest).toHaveBeenCalledWith('test.ts');
  });

  it('should handle validate command with --dir option', () => {
    const fs = require('node:fs');
    fs.existsSync.mockReturnValue(true);

    const sub = cmd.commands.find(c => c.name() === 'validate')!;
    sub.parse(['node', 'test', '--dir', '__tests__']);

    const { evaluateDirectory } = require('../../quality/test-validator');
    expect(evaluateDirectory).toHaveBeenCalled();
  });

  it('should handle run command when no targets found', async () => {
    const fs = require('node:fs');
    fs.existsSync.mockReturnValue(false);

    const sub = cmd.commands.find(c => c.name() === 'run')!;
    await sub.parseAsync(['node', 'test', '--limit', '1']);

    expect(fs.existsSync).toHaveBeenCalled();
  });
});
