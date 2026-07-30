const mockFsRead = jest.fn();
const mockGetIO = jest.fn().mockReturnValue({
  fs: {
    cwd: () => '/fake/root',
    exists: () => true,
    read: mockFsRead,
    mkDir: jest.fn(),
    write: jest.fn(),
    readDir: () => [],
    stat: () => ({ mtimeMs: Date.now(), size: 100 }),
    remove: jest.fn(),
  },
  shell: {
    exec: () => ({ status: 0, stdout: '', stderr: '' }),
    execString: () => ({ status: 0, stdout: '', stderr: '' }),
    spawn: () => ({ on: jest.fn(), pid: 0 }),
  },
  http: {
    get: () => Promise.resolve({ status: 200, data: null }),
    post: () => Promise.resolve({ status: 200, data: null }),
  },
});

jest.mock('../../io', () => ({ getIO: mockGetIO }));

import { readCoverageReport, summarizeCoverage, extractFileSummaries } from '../coverage-reader';
import type { CoverageReport } from '../types';

const validCoverageData = {
  total: {
    lines: { total: 100, covered: 75, skipped: 0, pct: 75 },
    statements: { total: 100, covered: 80, skipped: 0, pct: 80 },
    functions: { total: 50, covered: 35, skipped: 0, pct: 70 },
    branches: { total: 40, covered: 20, skipped: 0, pct: 50 },
  },
  '/fake/root/src/commands/test.ts': {
    lines: { total: 10, covered: 8, skipped: 0, pct: 80 },
    statements: { total: 10, covered: 9, skipped: 0, pct: 90 },
    functions: { total: 5, covered: 4, skipped: 0, pct: 80 },
    branches: { total: 4, covered: 2, skipped: 0, pct: 50 },
  },
};

function setupMockIO() {
  mockGetIO.mockReturnValue({
    fs: {
      cwd: () => '/fake/root',
      exists: () => true,
      read: mockFsRead,
      mkDir: jest.fn(),
      write: jest.fn(),
      readDir: () => [],
      stat: () => ({ mtimeMs: Date.now(), size: 100 }),
      remove: jest.fn(),
    },
    shell: {
      exec: () => ({ status: 0, stdout: '', stderr: '' }),
      execString: () => ({ status: 0, stdout: '', stderr: '' }),
      spawn: () => ({ on: jest.fn(), pid: 0 }),
    },
    http: {
      get: () => Promise.resolve({ status: 200, data: null }),
      post: () => Promise.resolve({ status: 200, data: null }),
    },
  });
}

beforeEach(() => {
  jest.clearAllMocks();
  mockFsRead.mockReturnValue(JSON.stringify(validCoverageData));
  setupMockIO();
});

describe('readCoverageReport', () => {
  it('returns null when no coverage file found', () => {
    mockFsRead.mockImplementation(() => { throw new Error('ENOENT'); });
    expect(readCoverageReport()).toBeNull();
  });

  it('returns a CoverageReport when file is found', () => {
    const report = readCoverageReport();
    expect(report).not.toBeNull();
    expect(report!.overall).toEqual({
      statements: 80,
      branches: 50,
      functions: 70,
      lines: 75,
    });
    expect(report!.files).toHaveLength(1);
    expect(report!.files[0]).toMatchObject({
      file: 'src/commands/test.ts',
      statements: 90,
      branches: 50,
      functions: 80,
      lines: 80,
      uncoveredLines: [],
      module: 'commands',
    });
  });

  it('uses custom path when provided', () => {
    const report = readCoverageReport('/custom/path/coverage-summary.json');
    expect(report).not.toBeNull();
    expect(mockFsRead).toHaveBeenCalledWith('/custom/path/coverage-summary.json', 'utf8');
  });

  it('returns null when total key is missing', () => {
    const noTotal = { 'src/file.ts': { lines: { pct: 50 }, statements: { pct: 50 }, functions: { pct: 50 }, branches: { pct: 50 } } };
    mockFsRead.mockReturnValue(JSON.stringify(noTotal));
    expect(readCoverageReport()).toBeNull();
  });

  it('throws on invalid JSON from read', () => {
    mockFsRead.mockReturnValue('not valid json');
    expect(() => readCoverageReport()).toThrow();
  });

  it('handles empty files array when only total exists', () => {
    const onlyTotal = {
      total: { lines: { pct: 0, total: 1, covered: 0, skipped: 0 }, statements: { pct: 0, total: 1, covered: 0, skipped: 0 }, functions: { pct: 0, total: 1, covered: 0, skipped: 0 }, branches: { pct: 0, total: 1, covered: 0, skipped: 0 } },
    };
    mockFsRead.mockReturnValue(JSON.stringify(onlyTotal));
    const report = readCoverageReport();
    expect(report).not.toBeNull();
    expect(report!.files).toHaveLength(0);
  });

  it('inferModule maps paths correctly', () => {
    const data = {
      total: { lines: { pct: 50, total: 1, covered: 0, skipped: 0 }, statements: { pct: 50, total: 1, covered: 0, skipped: 0 }, functions: { pct: 50, total: 1, covered: 0, skipped: 0 }, branches: { pct: 50, total: 1, covered: 0, skipped: 0 } },
      '/fake/root/src/commands/build.ts': { lines: { pct: 80, total: 1, covered: 1, skipped: 0 }, statements: { pct: 80, total: 1, covered: 1, skipped: 0 }, functions: { pct: 80, total: 1, covered: 1, skipped: 0 }, branches: { pct: 80, total: 1, covered: 1, skipped: 0 } },
      '/fake/root/src/quality/check.ts': { lines: { pct: 70, total: 1, covered: 1, skipped: 0 }, statements: { pct: 70, total: 1, covered: 1, skipped: 0 }, functions: { pct: 70, total: 1, covered: 1, skipped: 0 }, branches: { pct: 70, total: 1, covered: 1, skipped: 0 } },
      '/fake/root/src/utils/helper.ts': { lines: { pct: 60, total: 1, covered: 1, skipped: 0 }, statements: { pct: 60, total: 1, covered: 1, skipped: 0 }, functions: { pct: 60, total: 1, covered: 1, skipped: 0 }, branches: { pct: 60, total: 1, covered: 1, skipped: 0 } },
      '/fake/root/src/other/random.ts': { lines: { pct: 90, total: 1, covered: 1, skipped: 0 }, statements: { pct: 90, total: 1, covered: 1, skipped: 0 }, functions: { pct: 90, total: 1, covered: 1, skipped: 0 }, branches: { pct: 90, total: 1, covered: 1, skipped: 0 } },
    };
    mockFsRead.mockReturnValue(JSON.stringify(data));
    const report = readCoverageReport()!;
    const modules = report.files.map(f => f.module);
    expect(modules).toContain('commands');
    expect(modules).toContain('quality');
    expect(modules).toContain('utils');
    expect(modules).toContain('other');
  });
});

describe('summarizeCoverage', () => {
  it('computes average of all four metrics', () => {
    const report: CoverageReport = { overall: { statements: 80, branches: 50, functions: 70, lines: 75 }, files: [] };
    expect(summarizeCoverage(report)).toBe(69);
  });

  it('handles zero values', () => {
    const report: CoverageReport = { overall: { statements: 0, branches: 0, functions: 0, lines: 0 }, files: [] };
    expect(summarizeCoverage(report)).toBe(0);
  });

  it('handles perfect coverage', () => {
    const report: CoverageReport = { overall: { statements: 100, branches: 100, functions: 100, lines: 100 }, files: [] };
    expect(summarizeCoverage(report)).toBe(100);
  });
});

describe('extractFileSummaries', () => {
  it('returns file summary with coverage score and uncovered count', () => {
    const report: CoverageReport = {
      overall: { statements: 80, branches: 50, functions: 70, lines: 75 },
      files: [{
        file: 'src/commands/test.ts',
        statements: 90,
        branches: 50,
        functions: 80,
        lines: 80,
        uncoveredLines: [10, 20, 30],
        module: 'commands',
      }],
    };
    const summaries = extractFileSummaries(report);
    expect(summaries).toHaveLength(1);
    expect(summaries[0]).toEqual({
      file: 'src/commands/test.ts',
      module: 'commands',
      uncoveredCount: 3,
      coverageScore: 75,
    });
  });

  it('uses unknown module when missing', () => {
    const report: CoverageReport = {
      overall: { statements: 50, branches: 50, functions: 50, lines: 50 },
      files: [{
        file: 'src/other.ts',
        statements: 50,
        branches: 50,
        functions: 50,
        lines: 50,
        uncoveredLines: [],
      }],
    };
    const summaries = extractFileSummaries(report);
    expect(summaries[0].module).toBe('unknown');
  });

  it('returns empty array for no files', () => {
    const report: CoverageReport = { overall: { statements: 0, branches: 0, functions: 0, lines: 0 }, files: [] };
    expect(extractFileSummaries(report)).toEqual([]);
  });
});
