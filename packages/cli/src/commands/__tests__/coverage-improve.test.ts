import { coverageImproveCommand } from '../coverage-improve';

jest.mock('ts-morph', () => ({
  Project: class MockProject {},
  SyntaxKind: {},
}));

const mockExecFileSync = jest.fn();

jest.mock('node:child_process', () => ({
  execFileSync: (...args: unknown[]) => mockExecFileSync(...args),
}));

jest.mock('node:fs', () => ({
  existsSync: jest.fn(),
  readFileSync: jest.fn(),
  writeFileSync: jest.fn(),
  mkdirSync: jest.fn(),
  statSync: jest.fn(),
}));

import fs from 'node:fs';
const mockExistsSync = fs.existsSync as jest.Mock;
const mockReadFileSync = fs.readFileSync as jest.Mock;
const mockWriteFileSync = fs.writeFileSync as jest.Mock;
const mockMkdirSync = fs.mkdirSync as jest.Mock;
const mockStatSync = fs.statSync as jest.Mock;

let logSpy: jest.SpyInstance;
let errorSpy: jest.SpyInstance;

function makeEntry(linesPct: number, branchesPct: number) {
  return {
    lines: { total: 10, covered: Math.round(10 * linesPct / 100), pct: linesPct },
    functions: { total: 5, covered: Math.round(5 * linesPct / 100), pct: linesPct },
    branches: { total: 4, covered: Math.round(4 * branchesPct / 100), pct: branchesPct },
  };
}

beforeEach(() => {
  logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
  errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  mockExistsSync.mockReset().mockReturnValue(false);
  mockReadFileSync.mockReset().mockReturnValue('');
  mockWriteFileSync.mockReset();
  mockMkdirSync.mockReset();
  mockStatSync.mockReset();
  mockExecFileSync.mockReset();
});

afterEach(() => {
  logSpy.mockRestore();
  errorSpy.mockRestore();
});

describe('coverageImproveCommand', () => {
  it('creates a Command with correct description', () => {
    const cmd = coverageImproveCommand();
    expect(cmd.name()).toBe('coverage-improve');
    expect(cmd.description()).toContain('Gera stubs');
  });

  it('has all expected subcommands', () => {
    const cmd = coverageImproveCommand();
    const names = cmd.commands.map(c => c.name());
    expect(names).toEqual(expect.arrayContaining([
      'generate-stubs', 'validate-stubs', 'auto', 'status', 'batch', 'generate-real-tests',
    ]));
  });

  describe('generate-stubs', () => {
    it('reports error when coverage-summary.json is not found', () => {
      mockExistsSync.mockReturnValue(false);
      const cmd = coverageImproveCommand();
      cmd.exitOverride();
      cmd.parse(['node', 'test', 'generate-stubs']);
      expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining('not found'));
    });

    it('generates stubs for files below threshold', () => {
      mockExistsSync.mockImplementation((path: unknown) => {
        const p = String(path);
        if (p.includes('coverage-summary.json')) return true;
        if (p.includes('release.ts')) return true;
        return false;
      });
      mockReadFileSync.mockImplementation((path: unknown) => {
        const p = String(path);
        if (p.includes('coverage-summary.json')) {
          return JSON.stringify({
            total: makeEntry(50, 50),
            'src/commands/release.ts': makeEntry(10, 5),
          });
        }
        if (p.includes('release.ts')) return 'export function foo() {}\nexport const bar = 42;\nexport interface Baz { x: number; }';
        return '';
      });
      const cmd = coverageImproveCommand();
      cmd.exitOverride();
      cmd.parse(['node', 'test', 'generate-stubs']);
      const calls = mockWriteFileSync.mock.calls;
      expect(calls.length).toBeGreaterThan(0);
      const writtenPath = calls[0][0] as string;
      expect(writtenPath).toContain('__tests__');
      expect(writtenPath).toContain('release.test.ts');
    });

    it('skips files above threshold', () => {
      mockExistsSync.mockImplementation((path: unknown) => {
        const p = String(path);
        if (p.includes('coverage-summary.json')) return true;
        if (p.includes('release.ts')) return true;
        return false;
      });
      mockReadFileSync.mockImplementation((path: unknown) => {
        const p = String(path);
        if (p.includes('coverage-summary.json')) {
          return JSON.stringify({
            total: makeEntry(50, 50),
            'src/commands/release.ts': makeEntry(80, 70),
          });
        }
        if (p.includes('release.ts')) return 'export function foo() {}';
        return '';
      });
      const cmd = coverageImproveCommand();
      cmd.exitOverride();
      cmd.parse(['node', 'test', 'generate-stubs']);
      expect(mockWriteFileSync).not.toHaveBeenCalled();
    });

    it('skips test files, node_modules, and dist in coverage data', () => {
      mockExistsSync.mockImplementation((path: unknown) => {
        return String(path).includes('coverage-summary.json');
      });
      mockReadFileSync.mockImplementation((path: unknown) => {
        if (String(path).includes('coverage-summary.json')) {
          return JSON.stringify({
            total: makeEntry(50, 50),
            'src/commands/__tests__/foo.test.ts': makeEntry(10, 5),
            'node_modules/bar.ts': makeEntry(10, 5),
            'dist/baz.ts': makeEntry(10, 5),
          });
        }
        return '';
      });
      const cmd = coverageImproveCommand();
      cmd.exitOverride();
      cmd.parse(['node', 'test', 'generate-stubs']);
      expect(mockWriteFileSync).not.toHaveBeenCalled();
    });

    it('skips source files that do not exist on disk', () => {
      mockExistsSync.mockImplementation((path: unknown) => {
        return String(path).includes('coverage-summary.json');
      });
      mockReadFileSync.mockImplementation((path: unknown) => {
        if (String(path).includes('coverage-summary.json')) {
          return JSON.stringify({
            total: makeEntry(50, 50),
            'src/nonexistent.ts': makeEntry(10, 5),
          });
        }
        return '';
      });
      const cmd = coverageImproveCommand();
      cmd.exitOverride();
      cmd.parse(['node', 'test', 'generate-stubs']);
      expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('SKIP'));
    });

    it('handles --dry-run without writing files', () => {
      mockExistsSync.mockImplementation((path: unknown) => {
        const p = String(path);
        if (p.includes('coverage-summary.json')) return true;
        if (p.includes('release.ts')) return true;
        return false;
      });
      mockReadFileSync.mockImplementation((path: unknown) => {
        const p = String(path);
        if (p.includes('coverage-summary.json')) {
          return JSON.stringify({
            total: makeEntry(50, 50),
            'src/commands/release.ts': makeEntry(10, 5),
          });
        }
        if (p.includes('release.ts')) return 'export function foo() {}';
        return '';
      });
      const cmd = coverageImproveCommand();
      cmd.exitOverride();
      cmd.parse(['node', 'test', 'generate-stubs', '--dry-run']);
      expect(mockWriteFileSync).not.toHaveBeenCalled();
      expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('DRY-RUN'));
    });

    it('handles 0% coverage gracefully', () => {
      mockExistsSync.mockImplementation((path: unknown) => {
        const p = String(path);
        if (p.includes('coverage-summary.json')) return true;
        if (p.includes('release.ts')) return true;
        return false;
      });
      mockReadFileSync.mockImplementation((path: unknown) => {
        const p = String(path);
        if (p.includes('coverage-summary.json')) {
          return JSON.stringify({
            total: makeEntry(0, 0),
            'src/commands/release.ts': makeEntry(0, 0),
          });
        }
        if (p.includes('release.ts')) return 'export function foo() {}';
        return '';
      });
      const cmd = coverageImproveCommand();
      cmd.exitOverride();
      cmd.parse(['node', 'test', 'generate-stubs']);
      expect(mockWriteFileSync).toHaveBeenCalled();
    });

    it('handles 100% coverage by skipping', () => {
      mockExistsSync.mockImplementation((path: unknown) => {
        const p = String(path);
        if (p.includes('coverage-summary.json')) return true;
        if (p.includes('release.ts')) return true;
        return false;
      });
      mockReadFileSync.mockImplementation((path: unknown) => {
        const p = String(path);
        if (p.includes('coverage-summary.json')) {
          return JSON.stringify({
            total: makeEntry(100, 100),
            'src/commands/release.ts': makeEntry(100, 100),
          });
        }
        return '';
      });
      const cmd = coverageImproveCommand();
      cmd.exitOverride();
      cmd.parse(['node', 'test', 'generate-stubs']);
      expect(mockWriteFileSync).not.toHaveBeenCalled();
    });
  });

  describe('status', () => {
    it('shows N/A coverage when no coverage-summary is found', () => {
      mockExistsSync.mockReturnValue(false);
      const cmd = coverageImproveCommand();
      cmd.exitOverride();
      cmd.parse(['node', 'test', 'status']);
      expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('N/A'));
    });

    it('displays coverage data when coverage-summary exists', () => {
      mockExistsSync.mockImplementation((path: unknown) => {
        const p = String(path);
        if (p.includes('coverage-summary.json')) return true;
        if (p.includes('dist/index.js')) return true;
        return false;
      });
      mockReadFileSync.mockImplementation((path: unknown) => {
        if (String(path).includes('coverage-summary.json')) {
          return JSON.stringify({
            total: { lines: { pct: 65.5 }, branches: { pct: 45.2 }, functions: { pct: 55.0 } },
          });
        }
        return '';
      });
      const cmd = coverageImproveCommand();
      cmd.exitOverride();
      cmd.parse(['node', 'test', 'status']);
      expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('65.5'));
      expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('45.2'));
    });

    it('shows recommendations for low coverage', () => {
      mockExistsSync.mockImplementation((path: unknown) => {
        const p = String(path);
        if (p.includes('coverage-summary.json')) return true;
        if (p.includes('dist/index.js')) return true;
        return false;
      });
      mockReadFileSync.mockImplementation((path: unknown) => {
        if (String(path).includes('coverage-summary.json')) {
          return JSON.stringify({
            total: { lines: { pct: 30 }, branches: { pct: 20 }, functions: { pct: 25 } },
          });
        }
        return '';
      });
      const cmd = coverageImproveCommand();
      cmd.exitOverride();
      cmd.parse(['node', 'test', 'status']);
      expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('coverage-improve auto'));
    });
  });

  describe('validate-stubs', () => {
    it('handles async import and shows empty stubs list', async () => {
      mockExecFileSync.mockReturnValue('');
      const cmd = coverageImproveCommand();
      cmd.exitOverride();
      await cmd.parseAsync(['node', 'test', 'validate-stubs']);
      expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('Stubs encontrados'));
    });
  });

  describe('generate-real-tests', () => {
    it('skips when target file does not exist', async () => {
      mockExistsSync.mockReturnValue(false);
      mockExecFileSync.mockReturnValue('');
      const cmd = coverageImproveCommand();
      cmd.exitOverride();
      await cmd.parseAsync(['node', 'test', 'generate-real-tests', '--target', 'nonexistent.ts']);
      expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('0 arquivos'));
    });
  });

  describe('batch', () => {
    it('handles empty stub list and still runs', async () => {
      mockExecFileSync.mockReturnValue('');
      const cmd = coverageImproveCommand();
      cmd.exitOverride();
      await cmd.parseAsync(['node', 'test', 'batch', '--files', '5', '--iterations', '1']);
      expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('Batch'));
    });
  });
});
