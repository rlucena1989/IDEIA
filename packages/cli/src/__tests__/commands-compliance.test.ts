import { describe, it, expect, jest, beforeEach } from '@jest/globals';

const mockListFrameworks = jest.fn();
const mockGetFramework = jest.fn();
const mockMapRulesToFramework = jest.fn();
const mockGenerateReport = jest.fn();

jest.mock('../compliance/frameworks', () => ({
  listFrameworks: (...args: unknown[]) => mockListFrameworks(...args),
  getFramework: (...args: unknown[]) => mockGetFramework(...args),
}));

jest.mock('../compliance/mapper', () => ({
  mapRulesToFramework: (...args: unknown[]) => mockMapRulesToFramework(...args),
  generateReport: (...args: unknown[]) => mockGenerateReport(...args),
}));

const mockFsMkDir = jest.fn();
const mockFsWrite = jest.fn();
jest.mock('../io', () => ({
  getIO: () => ({
    fs: {
      mkDir: (p: string, r: boolean) => mockFsMkDir(p, r),
      write: (p: string, c: string) => mockFsWrite(p, c),
    },
  }),
}));

describe('commands - compliance', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockListFrameworks.mockReturnValue(['soc2', 'lgpd']);
    mockGetFramework.mockReturnValue({ id: 'soc2', name: 'SOC 2', requirements: [] });
    mockMapRulesToFramework.mockReturnValue({
      framework: 'soc2', frameworkName: 'SOC 2', matched: 3, total: 5,
      matches: [{ requirement: 'CC1', rule: 'some rule' }],
      gaps: ['CC2 — missing'], score: 60,
    });
    mockGenerateReport.mockReturnValue({
      overallScore: 60,
      mappings: [{ framework: 'soc2', frameworkName: 'SOC 2', score: 60, matched: 3, total: 5, gaps: ['CC2'] }],
    });
  });

  it('complianceCommand retorna Command com subcomandos', () => {
    const { complianceCommand } = require('../commands/compliance');
    const cmd = complianceCommand();
    expect(cmd.name()).toBe('compliance');
    const names = cmd.commands.map((c: { name: () => string }) => c.name());
    expect(names).toContain('map');
    expect(names).toContain('check');
    expect(names).toContain('report');
    expect(names).toContain('gap');
    expect(names).toContain('badges');
    expect(names).toContain('import');
  });

  it('complianceMapAction chama listFrameworks e mapRulesToFramework', () => {
    const { complianceMapAction } = require('../commands/compliance');
    complianceMapAction();
    expect(mockListFrameworks).toHaveBeenCalled();
    expect(mockMapRulesToFramework).toHaveBeenCalledTimes(2);
  });

  it('complianceCheckAction com framework valido', () => {
    const { complianceCheckAction } = require('../commands/compliance');
    complianceCheckAction('soc2');
    expect(mockGetFramework).toHaveBeenCalledWith('soc2');
    expect(mockMapRulesToFramework).toHaveBeenCalled();
  });

  it('complianceCheckAction com framework invalido', () => {
    mockGetFramework.mockReturnValue(null);
    const { complianceCheckAction } = require('../commands/compliance');
    expect(() => complianceCheckAction('invalid')).not.toThrow();
  });

  it('complianceReportAction chama generateReport', () => {
    const { complianceReportAction } = require('../commands/compliance');
    complianceReportAction();
    expect(mockGenerateReport).toHaveBeenCalled();
  });

  it('complianceGapAction com gaps', () => {
    const { complianceGapAction } = require('../commands/compliance');
    complianceGapAction('soc2');
    expect(mockMapRulesToFramework).toHaveBeenCalled();
  });

  it('complianceGapAction sem gaps', () => {
    mockMapRulesToFramework.mockReturnValue({
      framework: 'soc2', frameworkName: 'SOC 2', matched: 5, total: 5,
      matches: [], gaps: [], score: 100,
    });
    const { complianceGapAction } = require('../commands/compliance');
    expect(() => complianceGapAction('soc2')).not.toThrow();
  });

  it('complianceBadgesAction gera badges', () => {
    const { complianceBadgesAction } = require('../commands/compliance');
    expect(() => complianceBadgesAction()).not.toThrow();
    expect(mockListFrameworks).toHaveBeenCalled();
  });

  it('complianceImportAction com framework valido', () => {
    const { complianceImportAction } = require('../commands/compliance');
    complianceImportAction('soc2');
    expect(mockGetFramework).toHaveBeenCalledWith('soc2');
    expect(mockFsMkDir).toHaveBeenCalled();
    expect(mockFsWrite).toHaveBeenCalled();
  });

  it('complianceImportAction com framework invalido', () => {
    mockGetFramework.mockReturnValue(null);
    const { complianceImportAction } = require('../commands/compliance');
    complianceImportAction('invalid');
    expect(mockFsWrite).not.toHaveBeenCalled();
  });
});
