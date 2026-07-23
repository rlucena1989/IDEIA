import { runHealthChecks, REQUIRED_FILE_GROUPS } from '../required-files';
import fs from 'node:fs';

jest.mock('node:fs');

const mockExistsSync = fs.existsSync as jest.Mock;

describe('runHealthChecks', () => {
  beforeEach(() => {
    mockExistsSync.mockReset();
  });

  it('returns all passed when all files exist', () => {
    mockExistsSync.mockReturnValue(true);
    const report = runHealthChecks();
    expect(report.failed).toBe(0);
    expect(report.passed).toBe(report.total);
    expect(report.checks.length).toBeGreaterThan(0);
  });

  it('returns all failed when no files exist', () => {
    mockExistsSync.mockReturnValue(false);
    const report = runHealthChecks();
    expect(report.failed).toBe(report.total);
    expect(report.passed).toBe(0);
  });

  it('reports partial results', () => {
    let callCount = 0;
    mockExistsSync.mockImplementation(() => {
      callCount++;
      return callCount <= 2;
    });
    const report = runHealthChecks();
    expect(report.failed).toBeGreaterThan(0);
    expect(report.passed).toBeGreaterThan(0);
    expect(report.passed + report.failed).toBe(report.total);
  });

  it('includes all file groups', () => {
    mockExistsSync.mockReturnValue(true);
    const report = runHealthChecks();
    const groupLabels = [...new Set(report.checks.map(c => c.group))];
    for (const group of REQUIRED_FILE_GROUPS) {
      expect(groupLabels).toContain(group.label);
    }
  });

  it('checks correct file paths', () => {
    mockExistsSync.mockReturnValue(true);
    const report = runHealthChecks();
    expect(report.checks[0].file).toContain('.ai');
    expect(report.checks[0].exists).toBe(true);
  });
});
