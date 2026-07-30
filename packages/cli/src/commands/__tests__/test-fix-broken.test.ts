jest.mock('node:fs', () => ({
  existsSync: jest.fn(),
  readFileSync: jest.fn(),
  writeFileSync: jest.fn(),
}));

jest.mock('node:child_process', () => ({
  execFileSync: jest.fn(),
}));

import { testFixBrokenCommand } from '../test-fix-broken';

const mockExistsSync = require('node:fs').existsSync as jest.Mock;
const mockReadFileSync = require('node:fs').readFileSync as jest.Mock;
const mockWriteFileSync = require('node:fs').writeFileSync as jest.Mock;
const mockExecFileSync = require('node:child_process').execFileSync as jest.Mock;

let originalCwd: () => string;

beforeEach(() => {
  jest.clearAllMocks();
  originalCwd = process.cwd;
  process.cwd = () => '/test/project';
  mockExecFileSync.mockImplementation(() => '');
});

afterEach(() => {
  process.cwd = originalCwd;
});

describe('testFixBrokenCommand', () => {
  it('should be defined', () => {
    expect(testFixBrokenCommand).toBeDefined();
  });

  it('should return Command with name test-fix-broken', () => {
    const cmd = testFixBrokenCommand();
    expect(cmd.name()).toBe('test-fix-broken');
  });

  it('should have fix subcommand', () => {
    const cmd = testFixBrokenCommand();
    const names = cmd.commands.map((c: { name: () => string }) => c.name());
    expect(names).toContain('fix');
  });

  describe('fix command', () => {
    it('should show no files message when jest list fails', async () => {
      mockExecFileSync.mockImplementation(() => { throw new Error('jest not found'); });
      const cmd = testFixBrokenCommand();
      const fixCmd = cmd.commands.find((c: { name: () => string }) => c.name() === 'fix')!;
      const logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
      await fixCmd.parseAsync(['node', 'test']);
      expect(logSpy).toHaveBeenCalledWith('No test files found via jest --listTests.');
      logSpy.mockRestore();
    });

    it('should fix const requireMock to var (TDZ fix)', async () => {
      const testFile = '/test/project/test.spec.ts';
      mockExecFileSync.mockReturnValue(testFile);
      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue("const mockFs = jest.requireMock('node:fs');\n");

      const cmd = testFixBrokenCommand();
      const fixCmd = cmd.commands.find((c: { name: () => string }) => c.name() === 'fix')!;
      const logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
      await fixCmd.parseAsync(['node', 'test']);
      expect(mockWriteFileSync).toHaveBeenCalledWith(testFile, "var mockFs = jest.requireMock('node:fs');\n", 'utf8');
      logSpy.mockRestore();
    });

    it('should fix vitest import to @jest/globals', async () => {
      const testFile = '/test/project/vitest.spec.ts';
      mockExecFileSync.mockReturnValue(testFile);
      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue("import { describe, it } from 'vitest';\n");

      const cmd = testFixBrokenCommand();
      const fixCmd = cmd.commands.find((c: { name: () => string }) => c.name() === 'fix')!;
      const logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
      await fixCmd.parseAsync(['node', 'test']);
      expect(mockWriteFileSync).toHaveBeenCalledWith(testFile, "import { describe, it } from '@jest/globals';\n", 'utf8');
      logSpy.mockRestore();
    });

    it('should fix mockFs hoisting pattern', async () => {
      const testFile = '/test/project/mockfs.spec.ts';
      mockExecFileSync.mockReturnValue(testFile);
      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue("jest.mock('node:fs', () => mockFs);\n");

      const cmd = testFixBrokenCommand();
      const fixCmd = cmd.commands.find((c: { name: () => string }) => c.name() === 'fix')!;
      const logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
      await fixCmd.parseAsync(['node', 'test']);
      expect(mockWriteFileSync).toHaveBeenCalled();
      const written = mockWriteFileSync.mock.calls[0][1] as string;
      expect(written).toContain('jest.mock');
      expect(written).toContain('existsSync = jest.fn()');
      logSpy.mockRestore();
    });

    it('should handle missing mockYamlParse variable', async () => {
      const testFile = '/test/project/yaml.spec.ts';
      mockExecFileSync.mockReturnValue(testFile);
      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue("jest.mock('yaml', () => ({}));\nmockYamlParse.mock();\n");

      const cmd = testFixBrokenCommand();
      const fixCmd = cmd.commands.find((c: { name: () => string }) => c.name() === 'fix')!;
      const logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
      await fixCmd.parseAsync(['node', 'test']);
      expect(mockWriteFileSync).toHaveBeenCalled();
      const written = mockWriteFileSync.mock.calls[0][1] as string;
      expect(written).toContain('const mockYamlParse');
      logSpy.mockRestore();
    });

    it('should show dry-run without writing files', async () => {
      const testFile = '/test/project/dry.spec.ts';
      mockExecFileSync.mockReturnValue(testFile);
      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue("const mockFs = jest.requireMock('node:fs');\n");

      const cmd = testFixBrokenCommand();
      const fixCmd = cmd.commands.find((c: { name: () => string }) => c.name() === 'fix')!;
      const logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
      await fixCmd.parseAsync(['node', 'test', '--dry-run']);
      expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('[DRY-RUN]'));
      expect(mockWriteFileSync).not.toHaveBeenCalled();
      logSpy.mockRestore();
    });

    it('should skip non-existent files', async () => {
      mockExecFileSync.mockReturnValue('/test/project/missing.ts');
      mockExistsSync.mockReturnValue(false);
      const cmd = testFixBrokenCommand();
      const fixCmd = cmd.commands.find((c: { name: () => string }) => c.name() === 'fix')!;
      const logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
      await fixCmd.parseAsync(['node', 'test']);
      expect(mockReadFileSync).not.toHaveBeenCalled();
      logSpy.mockRestore();
    });
  });
});
