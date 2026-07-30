import fs from 'node:fs';
import { BaseRunner, RunnerConfig, RunnerCommandSpec } from '../base-runner';
import {
  RunStatus,
  LanguageId,
  AdapterCommandId,
  execCommand,
  DEFAULT_TIMEOUT_MS,
} from '../../adapter-contract';
import * as runnerModule from '../runner';

jest.mock('../../adapter-contract', () => ({
  ...jest.requireActual('../../adapter-contract'),
  execCommand: jest.fn(),
}));

jest.mock('../../adapter-runtime', () => ({
  defaultRuntime: {
    detect: jest.fn(),
    getRunner: jest.fn(),
    getSupportedLanguages: jest.fn().mockReturnValue([]),
  },
  AdapterRuntime: jest.fn(),
  DetectionResult: {},
}));

const mockExecCommand = jest.mocked(execCommand);

function mockReaddir(entries: Array<{ name: string; isDir: boolean }>) {
  const dirents = entries.map(e => ({
    name: e.name,
    isDirectory: () => e.isDir,
    isFile: () => !e.isDir,
    isBlockDevice: () => false,
    isCharacterDevice: () => false,
    isFIFO: () => false,
    isSocket: () => false,
    isSymbolicLink: () => false,
  }));
  return jest.spyOn(fs, 'readdirSync').mockImplementation(() => dirents as any);
}

class FullRunner extends BaseRunner {
  constructor(extraCommands?: Partial<Record<AdapterCommandId, RunnerCommandSpec>>) {
    super({
      language: LanguageId.TypeScript,
      name: 'Full Runner',
      aliases: ['full', 'ts'],
      markers: ['tsconfig.json', '*.ts'],
      commands: {
        [AdapterCommandId.Test]: { argv: ['jest'], label: 'Test', description: 'Run tests' },
        [AdapterCommandId.Lint]: { argv: ['eslint', '.'], label: 'Lint', description: 'Lint code' },
        [AdapterCommandId.Build]: { argv: ['tsc'], label: 'Build', description: 'Build project' },
        [AdapterCommandId.Init]: { argv: ['npm', 'install'], label: 'Init', description: 'Install deps' },
        [AdapterCommandId.Compile]: { argv: ['tsc', '--outDir', 'dist'], label: 'Compile', description: 'Compile TS' },
        ...extraCommands,
      },
    });
  }
}

class MinimalRunner extends BaseRunner {
  constructor() {
    super({
      language: LanguageId.Python,
      name: 'Minimal Runner',
      aliases: ['py'],
      markers: ['setup.py'],
      commands: {
        [AdapterCommandId.Build]: { argv: ['python', '-m', 'build'], label: 'Build', description: 'Build package' },
      },
    });
  }
}

describe('BaseRunner', () => {
  let runner: FullRunner;
  let minimalRunner: MinimalRunner;

  beforeEach(() => {
    jest.restoreAllMocks();
    mockExecCommand.mockReset();
    mockExecCommand.mockResolvedValue({ stdout: '', stderr: '', exitCode: 0, timedOut: false });
    runner = new FullRunner();
    minimalRunner = new MinimalRunner();
  });

  describe('configuration', () => {
    it('has correct language', () => {
      expect(runner.language).toBe(LanguageId.TypeScript);
    });

    it('has correct name', () => {
      expect(runner.name).toBe('Full Runner');
    });

    it('has correct aliases', () => {
      expect(runner.aliases).toEqual(['full', 'ts']);
    });
  });

  describe('detect', () => {
    it('returns true when marker file exists', () => {
      mockReaddir([{ name: 'tsconfig.json', isDir: false }]);
      expect(runner.detect('/some/project')).toBe(true);
    });

    it('returns false when no marker exists', () => {
      mockReaddir([{ name: 'README.md', isDir: false }]);
      expect(runner.detect('/some/project')).toBe(false);
    });

    it('supports extension glob markers (*.ext)', () => {
      mockReaddir([{ name: 'index.ts', isDir: false }]);
      expect(runner.detect('/some/project')).toBe(true);
    });

    it('walks subdirectories up to depth 3', () => {
      const readdirMock = jest.spyOn(fs, 'readdirSync').mockImplementation(() => [] as any);
      readdirMock.mockReturnValueOnce([{ name: 'src', isDirectory: () => true }] as any);
      readdirMock.mockReturnValueOnce([{ name: 'tsconfig.json', isDirectory: () => false }] as any);
      expect(runner.detect('/some/project')).toBe(true);
      expect(readdirMock).toHaveBeenCalledTimes(2);
    });

    it('skips node_modules, dist, and .git directories', () => {
      mockReaddir([{ name: 'node_modules', isDir: true }]);
      expect(runner.detect('/some/project')).toBe(false);
    });
  });

  describe('runCommand', () => {
    it('delegates to execCommand with correct args', async () => {
      await runner.runCommand(AdapterCommandId.Test, '/tmp');
      expect(mockExecCommand).toHaveBeenCalledWith(
        ['jest'],
        '/tmp',
        expect.objectContaining({ timeoutMs: DEFAULT_TIMEOUT_MS }),
      );
    });

    it('returns Success status when exit code is 0', async () => {
      mockExecCommand.mockResolvedValueOnce({ stdout: 'passed', stderr: '', exitCode: 0, timedOut: false });
      const result = await runner.runCommand(AdapterCommandId.Test, '/tmp');
      expect(result.status).toBe(RunStatus.Success);
      expect(result.exitCode).toBe(0);
    });

    it('returns Failure status when exit code is non-zero', async () => {
      mockExecCommand.mockResolvedValueOnce({ stdout: '', stderr: 'failed', exitCode: 1, timedOut: false });
      const result = await runner.runCommand(AdapterCommandId.Test, '/tmp');
      expect(result.status).toBe(RunStatus.Failure);
      expect(result.exitCode).toBe(1);
    });

    it('returns Timeout status when timedOut is true', async () => {
      mockExecCommand.mockResolvedValueOnce({ stdout: '', stderr: '', exitCode: 124, timedOut: true });
      const result = await runner.runCommand(AdapterCommandId.Test, '/tmp');
      expect(result.status).toBe(RunStatus.Timeout);
    });

    it('returns Skipped status when command is not in config', async () => {
      const result = await minimalRunner.runCommand(AdapterCommandId.Test, '/tmp');
      expect(result.status).toBe(RunStatus.Skipped);
      expect(mockExecCommand).not.toHaveBeenCalled();
    });

    it('passes timeoutMs from opts to execCommand', async () => {
      await runner.runCommand(AdapterCommandId.Test, '/tmp', { timeoutMs: 5000 });
      expect(mockExecCommand).toHaveBeenCalledWith(
        ['jest'],
        '/tmp',
        expect.objectContaining({ timeoutMs: 5000 }),
      );
    });

    it('passes env from opts to execCommand', async () => {
      await runner.runCommand(AdapterCommandId.Test, '/tmp', { env: { NODE_ENV: 'test' } });
      expect(mockExecCommand).toHaveBeenCalledWith(
        ['jest'],
        '/tmp',
        expect.objectContaining({ env: { NODE_ENV: 'test' } }),
      );
    });

    it('uses opts.cwd as effective working directory', async () => {
      await runner.runCommand(AdapterCommandId.Test, '/given', { cwd: '/effective' });
      expect(mockExecCommand).toHaveBeenCalledWith(
        ['jest'],
        '/effective',
        expect.any(Object),
      );
    });

    it('appends extra args from opts to argv', async () => {
      await runner.runCommand(AdapterCommandId.Test, '/tmp', { args: ['--coverage'] });
      expect(mockExecCommand).toHaveBeenCalledWith(
        ['jest', '--coverage'],
        '/tmp',
        expect.any(Object),
      );
    });
  });

  describe('init', () => {
    it('delegates to runCommand with Init id', async () => {
      await runner.init('/tmp');
      expect(mockExecCommand).toHaveBeenCalledWith(
        ['npm', 'install'],
        '/tmp',
        expect.any(Object),
      );
    });
  });

  describe('lint', () => {
    it('delegates to runCommand with Lint id', async () => {
      await runner.lint('/tmp');
      expect(mockExecCommand).toHaveBeenCalledWith(
        ['eslint', '.'],
        '/tmp',
        expect.any(Object),
      );
    });
  });

  describe('test', () => {
    it('delegates to runCommand with Test id', async () => {
      await runner.test('/tmp');
      expect(mockExecCommand).toHaveBeenCalledWith(
        ['jest'],
        '/tmp',
        expect.any(Object),
      );
    });
  });

  describe('build', () => {
    it('delegates to runCommand with Build id', async () => {
      await runner.build('/tmp');
      expect(mockExecCommand).toHaveBeenCalledWith(
        ['tsc'],
        '/tmp',
        expect.any(Object),
      );
    });
  });

  describe('compile', () => {
    it('delegates to runCommand with Compile id', async () => {
      await runner.compile('/tmp');
      expect(mockExecCommand).toHaveBeenCalledWith(
        ['tsc', '--outDir', 'dist'],
        '/tmp',
        expect.any(Object),
      );
    });
  });

  describe('qualityGate', () => {
    it('runs quality-gate command when defined', async () => {
      const qgRunner = new FullRunner({
        [AdapterCommandId.QualityGate]: {
          argv: ['npm', 'run', 'quality'],
          label: 'QG',
          description: 'Quality gate',
        },
      });
      await qgRunner.qualityGate('/tmp');
      expect(mockExecCommand).toHaveBeenCalledWith(
        ['npm', 'run', 'quality'],
        '/tmp',
        expect.any(Object),
      );
    });

    it('falls back to lint when quality-gate is not defined', async () => {
      await runner.qualityGate('/tmp');
      expect(mockExecCommand).toHaveBeenCalledWith(
        ['eslint', '.'],
        '/tmp',
        expect.any(Object),
      );
    });

    it('falls back to build when neither quality-gate nor lint are defined', async () => {
      await minimalRunner.qualityGate('/tmp');
      expect(mockExecCommand).toHaveBeenCalledWith(
        ['python', '-m', 'build'],
        '/tmp',
        expect.any(Object),
      );
    });
  });

  describe('commands', () => {
    it('returns all configured commands plus detect', () => {
      const cmds = runner.commands();
      const ids = cmds.map(c => c.id);
      expect(ids).toContain(AdapterCommandId.Test);
      expect(ids).toContain(AdapterCommandId.Lint);
      expect(ids).toContain(AdapterCommandId.Build);
      expect(ids).toContain(AdapterCommandId.Init);
      expect(ids).toContain(AdapterCommandId.Compile);
      expect(ids).toContain(AdapterCommandId.Detect);
      expect(cmds.length).toBe(6);
    });

    it('each command has id, label, description, and run function', () => {
      const cmds = runner.commands();
      for (const cmd of cmds) {
        expect(cmd.id).toBeDefined();
        expect(typeof cmd.label).toBe('string');
        expect(typeof cmd.description).toBe('string');
        expect(typeof cmd.run).toBe('function');
      }
    });

    it('detect command is always added last', () => {
      const cmds = runner.commands();
      expect(cmds[cmds.length - 1].id).toBe(AdapterCommandId.Detect);
    });

    it('run function of a command delegates to execCommand', async () => {
      const cmds = runner.commands();
      const testCmd = cmds.find(c => c.id === AdapterCommandId.Test)!;
      await testCmd.run('/tmp');
      expect(mockExecCommand).toHaveBeenCalledWith(
        ['jest'],
        '/tmp',
        expect.any(Object),
      );
    });
  });
});

const mockRuntime = jest.mocked(runnerModule.getDefaultRuntime());

describe('runner.ts facade', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getDefaultRuntime', () => {
    it('returns the defaultRuntime singleton', () => {
      const runtime = runnerModule.getDefaultRuntime();
      expect(runtime).toBeDefined();
      expect(typeof runtime.detect).toBe('function');
      expect(typeof runtime.getSupportedLanguages).toBe('function');
    });
  });

  describe('detectRunner', () => {
    it('returns undefined when no language is detected', () => {
      mockRuntime.detect.mockReturnValue({ primary: null, languages: [], raw: [] });
      const result = runnerModule.detectRunner('/some/dir');
      expect(result).toBeUndefined();
    });

    it('returns the runner for the detected primary language', () => {
      const fakeRunner = { language: 'node', name: 'Fake', detect: jest.fn() };
      mockRuntime.detect.mockReturnValue({ primary: LanguageId.Node, languages: [LanguageId.Node], raw: ['Node.js'] });
      mockRuntime.getRunner.mockReturnValue(fakeRunner as any);
      const result = runnerModule.detectRunner('/some/dir');
      expect(result).toBe(fakeRunner);
      expect(mockRuntime.getRunner).toHaveBeenCalledWith(LanguageId.Node);
    });
  });

  describe('listLanguages', () => {
    it('returns an array of supported LanguageId values', () => {
      mockRuntime.getSupportedLanguages.mockReturnValue([LanguageId.Node, LanguageId.Python]);
      const langs = runnerModule.listLanguages();
      expect(Array.isArray(langs)).toBe(true);
      expect(langs.length).toBe(2);
      expect(langs).toContain(LanguageId.Node);
    });
  });
});
