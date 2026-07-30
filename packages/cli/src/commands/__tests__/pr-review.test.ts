import { describe, it, expect } from '@jest/globals';
import { parseDiff, checkFileExtension, runComplianceChecks, runPRReview, formatPRReview, prReviewCommand } from '../pr-review';
import type { DiffFile, PRReviewReport } from '../pr-review';

jest.mock('../../io', () => ({
  getIO: jest.fn().mockReturnValue({
    fs: { exists: jest.fn(), mkDir: jest.fn(), write: jest.fn() },
    shell: { execString: jest.fn() },
  }),
}));
jest.mock('../../utils/review/index', () => ({
  antiSlop: jest.fn().mockReturnValue([]),
  securityScan: jest.fn().mockReturnValue([]),
  performanceCheck: jest.fn().mockReturnValue([]),
  regressionCheck: jest.fn().mockReturnValue([]),
}));

function getIO() { return require('../../io').getIO(); }

describe('pr-review', () => {
  let consoleSpy: jest.SpyInstance;
  let errorSpy: jest.SpyInstance;
  let exitSpy: jest.SpyInstance;

  beforeEach(() => {
    consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    exitSpy = jest.spyOn(process, 'exit').mockImplementation(() => undefined as never);
    jest.clearAllMocks();
  });

  afterEach(() => {
    consoleSpy.mockRestore();
    errorSpy.mockRestore();
    exitSpy.mockRestore();
  });

  it('parseDiff should be defined', () => { expect(parseDiff).toBeDefined(); });
  it('checkFileExtension should be defined', () => { expect(checkFileExtension).toBeDefined(); });
  it('runComplianceChecks should be defined', () => { expect(runComplianceChecks).toBeDefined(); });
  it('runPRReview should be defined', () => { expect(runPRReview).toBeDefined(); });
  it('formatPRReview should be defined', () => { expect(formatPRReview).toBeDefined(); });

  // parseDiff
  it('parses standard diff with one hunk', () => {
    const result = parseDiff('@@ -1,5 +1,7 @@\n line1\n+added\n line2\n-removed\n');
    expect(result).toHaveLength(1);
    expect(result[0].startLine).toBe(1);
    expect(result[0].lineCount).toBe(1);
  });

  it('parses diff with multiple hunks', () => {
    const result = parseDiff('@@ -1,3 +1,4 @@\n a\n+b\n@@ -10,5 +10,6 @@\n x\n+y\n');
    expect(result).toHaveLength(2);
  });

  it('returns empty for empty string', () => { expect(parseDiff('')).toEqual([]); });
  it('handles no hunks', () => { expect(parseDiff('plain text')).toEqual([]); });
  it('counts only + lines (not +++ header)', () => {
    const result = parseDiff('@@ -1,3 +1,3 @@\n+++ b/new.ts\n+real\n');
    expect(result[0].lineCount).toBe(1);
  });

  // checkFileExtension
  it('accepts .ts', () => { expect(checkFileExtension('f.ts')).toBe(true); });
  it('accepts .tsx', () => { expect(checkFileExtension('f.tsx')).toBe(true); });
  it('accepts .json', () => { expect(checkFileExtension('f.json')).toBe(true); });
  it('accepts .md', () => { expect(checkFileExtension('f.md')).toBe(true); });
  it('rejects .exe', () => { expect(checkFileExtension('f.exe')).toBe(false); });
  it('rejects .txt', () => { expect(checkFileExtension('f.txt')).toBe(false); });
  it('rejects no extension', () => { expect(checkFileExtension('Makefile')).toBe(false); });

  // runComplianceChecks
  it('returns passed for existing files', () => {
    getIO().fs.exists.mockReturnValue(true);
    runComplianceChecks('/root').forEach(r => expect(r.status).toBe('passed'));
  });
  it('returns failed for missing files', () => {
    getIO().fs.exists.mockReturnValue(false);
    runComplianceChecks('/root').forEach(r => expect(r.status).toBe('failed'));
  });

  // formatPRReview
  it('generates markdown', () => {
    const md = formatPRReview({ summary: { filesChanged: 2, findings: 1, critical: 0, high: 1, medium: 0, low: 0, score: 90 }, findings: [{ file: 'a.ts', line: 5, severity: 'high', message: 'Issue', type: 'security' }], inlineSuggestions: [], compliance: [{ rule: 'AGENTS.md', status: 'passed', details: 'OK' }] });
    expect(md).toContain('PR Review');
    expect(md).toContain('Issue');
    expect(md).toContain('AGENTS.md');
  });

  it('formats empty report without findings section', () => {
    const md = formatPRReview({ summary: { filesChanged: 0, findings: 0, critical: 0, high: 0, medium: 0, low: 0, score: 100 }, findings: [], inlineSuggestions: [], compliance: [] });
    expect(md).toContain('Score');
    expect(md).not.toContain('## Findings');
  });

  // runPRReview
  it('returns empty report for no changes', () => {
    getIO().shell.execString.mockReturnValue({ status: 1, stdout: '' });
    const report = runPRReview('/root');
    expect(report.summary.filesChanged).toBe(0);
    expect(report.summary.score).toBe(100);
  });

  it('processes changes with findings', () => {
    getIO().shell.execString.mockImplementation((cmd: string) => {
      if (cmd.includes('--name-only')) return { status: 0, stdout: 'src/test.ts\n' };
      if (cmd.includes('-- "src/test.ts"')) return { status: 0, stdout: '@@ -1,3 +1,4 @@\n+new\n' };
      return { status: 0, stdout: '' };
    });
    getIO().fs.exists.mockReturnValue(true);
    const { antiSlop } = require('../../utils/review/index');
    antiSlop.mockReturnValue([{ file: 'src/test.ts', line: 1, severity: 'high', message: 'Anti-pattern', type: 'antiSlop' }]);
    const report = runPRReview('/root');
    expect(report.summary.filesChanged).toBe(1);
    expect(report.summary.findings).toBe(1);
  });

  it('skips non-source files', () => {
    getIO().shell.execString.mockImplementation((cmd: string) => {
      if (cmd.includes('--name-only')) return { status: 0, stdout: 'file.exe\nfile.txt\n' };
      return { status: 0, stdout: '' };
    });
    getIO().fs.exists.mockReturnValue(true);
    const report = runPRReview('/root');
    expect(report.summary.filesChanged).toBe(2);
    expect(report.summary.findings).toBe(0);
  });

  it('saves report with changes', () => {
    getIO().shell.execString.mockImplementation((cmd: string) => {
      if (cmd.includes('--name-only')) return { status: 0, stdout: 'src/test.ts\n' };
      if (cmd.includes('-- "src/test.ts"')) return { status: 0, stdout: '@@ -1,3 +1,4 @@\n+new\n' };
      return { status: 0, stdout: '' };
    });
    getIO().fs.exists.mockReturnValue(true);
    runPRReview('/root');
    expect(getIO().fs.mkDir).toHaveBeenCalled();
    expect(getIO().fs.write).toHaveBeenCalled();
  });

  it('returns score 100 for no findings', () => {
    getIO().shell.execString.mockReturnValue({ status: 1, stdout: '' });
    const report = runPRReview('/root');
    expect(report.summary.score).toBe(100);
  });
});
