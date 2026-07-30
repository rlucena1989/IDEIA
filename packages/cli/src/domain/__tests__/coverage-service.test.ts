import type { CoverageReport, CoverageGap, AutonomyStatus } from '../../coverage/types';

jest.mock('../../coverage/coverage-reader', () => ({
  readCoverageReport: jest.fn(),
  summarizeCoverage: jest.fn(),
  extractFileSummaries: jest.fn(),
}));

jest.mock('../../coverage/gap-prioritizer', () => ({
  prioritizeGaps: jest.fn(),
  rankBySeverity: jest.fn(),
}));

jest.mock('../../coverage/test-quality-classifier', () => ({
  classifyTestGap: jest.fn(),
}));

jest.mock('../../coverage/status', () => ({
  buildAutonomyStatus: jest.fn(),
  saveAutonomyStatus: jest.fn(),
  loadAutonomyStatus: jest.fn(),
}));

import { readCoverageReport, summarizeCoverage, extractFileSummaries } from '../../coverage/coverage-reader';
import { prioritizeGaps, rankBySeverity } from '../../coverage/gap-prioritizer';
import { classifyTestGap } from '../../coverage/test-quality-classifier';
import { buildAutonomyStatus, saveAutonomyStatus, loadAutonomyStatus } from '../../coverage/status';

const mockReadCoverageReport = readCoverageReport as jest.Mock;
const mockSummarizeCoverage = summarizeCoverage as jest.Mock;
const mockExtractFileSummaries = extractFileSummaries as jest.Mock;
const mockPrioritizeGaps = prioritizeGaps as jest.Mock;
const mockRankBySeverity = rankBySeverity as jest.Mock;
const mockClassifyTestGap = classifyTestGap as jest.Mock;
const mockBuildAutonomyStatus = buildAutonomyStatus as jest.Mock;
const mockSaveAutonomyStatus = saveAutonomyStatus as jest.Mock;
const mockLoadAutonomyStatus = loadAutonomyStatus as jest.Mock;

function makeSampleReport(): CoverageReport {
  return {
    overall: { statements: 80, branches: 70, functions: 85, lines: 75 },
    files: [
      { file: 'src/commands/build.ts', statements: 45, branches: 30, functions: 50, lines: 40, uncoveredLines: [], module: 'commands' },
      { file: 'src/utils/helper.ts', statements: 90, branches: 85, functions: 95, lines: 90, uncoveredLines: [], module: 'utils' },
      { file: 'src/runtime/core.ts', statements: 30, branches: 25, functions: 35, lines: 30, uncoveredLines: [], module: 'runtime' },
    ],
  };
}

describe('coverage-service', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    mockClassifyTestGap.mockReturnValue('important');
  });

  describe('handleCoverageAudit', () => {
    it('returns audit output when report exists', () => {
      const report = makeSampleReport();
      mockReadCoverageReport.mockReturnValue(report);
      mockSummarizeCoverage.mockReturnValue(75);

      const { handleCoverageAudit } = jest.requireActual('../coverage-service');
      const result = handleCoverageAudit();

      expect(result.ok).toBe(true);
      expect(result.data?.overall).toEqual(report.overall);
      expect(result.data?.average).toBe(75);
      expect(result.data?.fileCount).toBe(3);
      expect(result.data?.gaps).toHaveLength(2);
      expect(result.data?.gaps[0].file).toContain('build.ts');
      expect(result.data?.gaps[1].file).toContain('core.ts');
    });

    it('returns failure when no report is found', () => {
      mockReadCoverageReport.mockReturnValue(null);

      const { handleCoverageAudit } = jest.requireActual('../coverage-service');
      const result = handleCoverageAudit();

      expect(result.ok).toBe(false);
      expect(result.code).toBe(1);
    });
  });

  describe('handleCoverageGaps', () => {
    it('returns gaps with ranking', () => {
      const report = makeSampleReport();
      mockReadCoverageReport.mockReturnValue(report);
      mockPrioritizeGaps.mockImplementation((gaps: CoverageGap[]) => [...gaps].sort((a, b) => a.file.localeCompare(b.file)));
      mockRankBySeverity.mockReturnValue({ critical: [], important: [], optional: [], cosmetic: [] });

      const { handleCoverageGaps } = jest.requireActual('../coverage-service');
      const result = handleCoverageGaps();

      expect(result.ok).toBe(true);
      expect(result.data?.total).toBeGreaterThan(0);
      expect(result.data?.ranked).toBeDefined();
    });

    it('filters gaps by severity when param is provided', () => {
      const report = makeSampleReport();
      mockReadCoverageReport.mockReturnValue(report);
      mockClassifyTestGap.mockReturnValue('critical');
      mockPrioritizeGaps.mockImplementation((gaps: CoverageGap[]) => gaps);
      mockRankBySeverity.mockReturnValue({ critical: [], important: [], optional: [], cosmetic: [] });

      const { handleCoverageGaps } = jest.requireActual('../coverage-service');
      const result = handleCoverageGaps('critical');

      expect(result.ok).toBe(true);
    });

    it('returns failure when no report', () => {
      mockReadCoverageReport.mockReturnValue(null);

      const { handleCoverageGaps } = jest.requireActual('../coverage-service');
      const result = handleCoverageGaps();

      expect(result.ok).toBe(false);
      expect(result.code).toBe(1);
    });
  });

  describe('handleCoverageRepair', () => {
    it('repairs gaps up to maxIterations', () => {
      const report = makeSampleReport();
      mockReadCoverageReport.mockReturnValue(report);
      mockPrioritizeGaps.mockImplementation((gaps: CoverageGap[]) => [...gaps].reverse());
      mockSummarizeCoverage.mockReturnValue(60);
      mockBuildAutonomyStatus.mockReturnValue({ lastRunAt: '2026-07-26', overallCoverage: 60, gapsFound: 2, gapsResolved: 1, blocked: false });

      const { handleCoverageRepair } = jest.requireActual('../coverage-service');
      const result = handleCoverageRepair(1);

      expect(result.ok).toBe(true);
      expect(result.data?.repaired).toHaveLength(1);
      expect(mockSaveAutonomyStatus).toHaveBeenCalledTimes(1);
    });

    it('returns failure when no report', () => {
      mockReadCoverageReport.mockReturnValue(null);

      const { handleCoverageRepair } = jest.requireActual('../coverage-service');
      const result = handleCoverageRepair(5);

      expect(result.ok).toBe(false);
      expect(result.code).toBe(1);
    });
  });

  describe('handleCoverageStatus', () => {
    it('returns status persisted data', () => {
      const report = makeSampleReport();
      mockReadCoverageReport.mockReturnValue(report);
      mockSummarizeCoverage.mockReturnValue(72);
      mockLoadAutonomyStatus.mockReturnValue({ overallCoverage: 70, gapsFound: 3, gapsResolved: 1, blocked: false } as AutonomyStatus);

      const { handleCoverageStatus } = jest.requireActual('../coverage-service');
      const result = handleCoverageStatus();

      expect(result.ok).toBe(true);
      expect(result.data?.current).toBe(72);
      expect(result.data?.target).toBe(80);
      expect(result.data?.gaps).toBeGreaterThan(0);
      expect(result.data?.persisted).toBeDefined();
    });

    it('returns zero values when no report', () => {
      mockReadCoverageReport.mockReturnValue(null);
      mockLoadAutonomyStatus.mockReturnValue(null);

      const { handleCoverageStatus } = jest.requireActual('../coverage-service');
      const result = handleCoverageStatus();

      expect(result.ok).toBe(true);
      expect(result.data?.current).toBe(0);
      expect(result.data?.gaps).toBe(0);
      expect(result.data?.persisted).toBeNull();
    });
  });
});
