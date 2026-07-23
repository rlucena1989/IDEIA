import path from 'node:path';
import fs from 'node:fs';
import os from 'node:os';
import { readCoverageReport, summarizeCoverage, extractFileSummaries } from '../coverage/coverage-reader';
import { scoreGap, prioritizeGaps, rankBySeverity } from '../coverage/gap-prioritizer';
import { classifyTestGap, isCosmetic, isCriticalCoverage } from '../coverage/test-quality-classifier';
import { buildAutonomyStatus, saveAutonomyStatus, loadAutonomyStatus, setRootOverride } from '../coverage/status';
import { runRepairLoop, repairSingleGap, validateAfterRepair, shouldContinueLoop } from '../coverage/test-repair-loop';
import type { CoverageReport, CoverageGap, AutonomyStatus } from '../coverage/types';

const FIXTURE_REPORT: CoverageReport = {
  overall: { statements: 85, branches: 70, functions: 90, lines: 88 },
  files: [
    { file: 'src/commands/test.ts', statements: 60, branches: 40, functions: 70, lines: 65, uncoveredLines: [], module: 'commands' },
    { file: 'src/runtime/core.ts', statements: 90, branches: 85, functions: 92, lines: 91, uncoveredLines: [], module: 'runtime' },
    { file: 'src/utils/helpers.ts', statements: 30, branches: 20, functions: 40, lines: 35, uncoveredLines: [], module: 'utils' },
  ],
};

describe('readCoverageReport', () => {
  it('returns null when no report found', () => {
    const result = readCoverageReport('/nonexistent/path/coverage-summary.json');
    expect(result).toBeNull();
  });

  it('parses a valid coverage summary from custom path', () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cov-test-'));
    const fixturePath = path.join(tmpDir, 'coverage-summary.json');
    const jestData = {
      total: { lines: { total: 100, covered: 88, pct: 88 }, statements: { total: 120, covered: 102, pct: 85 }, functions: { total: 50, covered: 45, pct: 90 }, branches: { total: 60, covered: 42, pct: 70 } },
      'src/commands/test.ts': { lines: { total: 20, covered: 13, pct: 65 }, statements: { total: 25, covered: 15, pct: 60 }, functions: { total: 10, covered: 7, pct: 70 }, branches: { total: 10, covered: 4, pct: 40 } },
      'src/runtime/core.ts': { lines: { total: 30, covered: 27, pct: 91 }, statements: { total: 35, covered: 31, pct: 90 }, functions: { total: 12, covered: 11, pct: 92 }, branches: { total: 20, covered: 17, pct: 85 } },
    };
    fs.writeFileSync(fixturePath, JSON.stringify(jestData), 'utf8');

    const result = readCoverageReport(fixturePath);
    expect(result).not.toBeNull();
    expect(result!.overall.lines).toBe(88);
    expect(result!.overall.statements).toBe(85);
    expect(result!.files.length).toBe(2);
    expect(result!.files[0].module).toBe('commands');

    fs.rmSync(tmpDir, { recursive: true, force: true });
  });
});

describe('summarizeCoverage', () => {
  it('calculates average across all metrics', () => {
    const avg = summarizeCoverage(FIXTURE_REPORT);
    expect(avg).toBe(83);
  });

  it('returns 0 for empty coverage', () => {
    const empty: CoverageReport = {
      overall: { statements: 0, branches: 0, functions: 0, lines: 0 },
      files: [],
    };
    expect(summarizeCoverage(empty)).toBe(0);
  });
});

describe('extractFileSummaries', () => {
  it('extracts summaries with coverage scores', () => {
    const summaries = extractFileSummaries(FIXTURE_REPORT);
    expect(summaries).toHaveLength(3);
    expect(summaries[0].file).toBe('src/commands/test.ts');
    expect(summaries[0].coverageScore).toBe(59);
    expect(summaries[1].coverageScore).toBe(90);
    expect(summaries[2].coverageScore).toBe(31);
  });
});

describe('scoreGap', () => {
  it('returns 100 for critical', () => {
    expect(scoreGap({ id: 'g', file: 'f', module: 'm', severity: 'critical', reason: '', impact: '', recommendation: '' })).toBe(100);
  });

  it('returns 70 for important', () => {
    expect(scoreGap({ id: 'g', file: 'f', module: 'm', severity: 'important', reason: '', impact: '', recommendation: '' })).toBe(70);
  });

  it('returns 40 for optional', () => {
    expect(scoreGap({ id: 'g', file: 'f', module: 'm', severity: 'optional', reason: '', impact: '', recommendation: '' })).toBe(40);
  });

  it('returns 10 for cosmetic', () => {
    expect(scoreGap({ id: 'g', file: 'f', module: 'm', severity: 'cosmetic', reason: '', impact: '', recommendation: '' })).toBe(10);
  });
});

describe('prioritizeGaps', () => {
  it('sorts gaps by severity descending', () => {
    const gaps: CoverageGap[] = [
      { id: 'a', file: 'a', module: 'm', severity: 'optional', reason: '', impact: '', recommendation: '' },
      { id: 'b', file: 'b', module: 'm', severity: 'critical', reason: '', impact: '', recommendation: '' },
      { id: 'c', file: 'c', module: 'm', severity: 'important', reason: '', impact: '', recommendation: '' },
    ];

    const sorted = prioritizeGaps(gaps);
    expect(sorted[0].id).toBe('b');
    expect(sorted[1].id).toBe('c');
    expect(sorted[2].id).toBe('a');
  });

  it('does not mutate original array', () => {
    const gaps: CoverageGap[] = [
      { id: 'a', file: 'a', module: 'm', severity: 'optional', reason: '', impact: '', recommendation: '' },
      { id: 'b', file: 'b', module: 'm', severity: 'critical', reason: '', impact: '', recommendation: '' },
    ];

    const sorted = prioritizeGaps(gaps);
    expect(sorted).not.toBe(gaps);
    expect(gaps[0].id).toBe('a');
  });
});

describe('readCoverageReport module inference', () => {
  it('infers quality module from path', () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cov-mod-'));
    const fixturePath = path.join(tmpDir, 'coverage-summary.json');
    const jestData = {
      total: { lines: { total: 10, covered: 8, pct: 80 }, statements: { total: 10, covered: 8, pct: 80 }, functions: { total: 5, covered: 4, pct: 80 }, branches: { total: 4, covered: 3, pct: 75 } },
      'src/quality/checker.ts': { lines: { total: 10, covered: 8, pct: 80 }, statements: { total: 10, covered: 8, pct: 80 }, functions: { total: 5, covered: 4, pct: 80 }, branches: { total: 4, covered: 3, pct: 75 } },
      'src/io/reader.ts': { lines: { total: 10, covered: 8, pct: 80 }, statements: { total: 10, covered: 8, pct: 80 }, functions: { total: 5, covered: 4, pct: 80 }, branches: { total: 4, covered: 3, pct: 75 } },
      'src/lib/misc.ts': { lines: { total: 10, covered: 8, pct: 80 }, statements: { total: 10, covered: 8, pct: 80 }, functions: { total: 5, covered: 4, pct: 80 }, branches: { total: 4, covered: 3, pct: 75 } },
    };
    fs.writeFileSync(fixturePath, JSON.stringify(jestData), 'utf8');
    const result = readCoverageReport(fixturePath);
    expect(result!.files.find(f => f.file.includes('quality'))!.module).toBe('quality');
    expect(result!.files.find(f => f.file.includes('io'))!.module).toBe('io');
    expect(result!.files.find(f => f.file.includes('misc'))!.module).toBe('other');
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });
});

describe('rankBySeverity', () => {
  it('groups gaps by severity', () => {
    const gaps: CoverageGap[] = [
      { id: 'a', file: 'a', module: 'm', severity: 'critical', reason: '', impact: '', recommendation: '' },
      { id: 'b', file: 'b', module: 'm', severity: 'important', reason: '', impact: '', recommendation: '' },
      { id: 'c', file: 'c', module: 'm', severity: 'critical', reason: '', impact: '', recommendation: '' },
      { id: 'd', file: 'd', module: 'm', severity: 'cosmetic', reason: '', impact: '', recommendation: '' },
    ];

    const ranked = rankBySeverity(gaps);
    expect(ranked.critical).toHaveLength(2);
    expect(ranked.important).toHaveLength(1);
    expect(ranked.optional).toHaveLength(0);
    expect(ranked.cosmetic).toHaveLength(1);
  });
});

describe('classifyTestGap', () => {
  it('classifies critical for auth', () => {
    const gap: CoverageGap = { id: 'g', file: 'f', module: 'm', severity: 'optional', reason: 'auth failure', impact: '', recommendation: '' };
    expect(classifyTestGap(gap)).toBe('critical');
  });

  it('classifies critical for data loss', () => {
    const gap: CoverageGap = { id: 'g', file: 'f', module: 'm', severity: 'optional', reason: 'data loss risk', impact: '', recommendation: '' };
    expect(classifyTestGap(gap)).toBe('critical');
  });

  it('classifies important for core', () => {
    const gap: CoverageGap = { id: 'g', file: 'f', module: 'm', severity: 'optional', reason: 'core module', impact: '', recommendation: '' };
    expect(classifyTestGap(gap)).toBe('important');
  });

  it('classifies important for regression', () => {
    const gap: CoverageGap = { id: 'g', file: 'f', module: 'm', severity: 'optional', reason: 'regression risk', impact: '', recommendation: '' };
    expect(classifyTestGap(gap)).toBe('important');
  });

  it('classifies cosmetic for nice to have', () => {
    const gap: CoverageGap = { id: 'g', file: 'f', module: 'm', severity: 'optional', reason: 'nice to have', impact: '', recommendation: '' };
    expect(classifyTestGap(gap)).toBe('cosmetic');
  });

  it('classifies cosmetic for visual', () => {
    const gap: CoverageGap = { id: 'g', file: 'f', module: 'm', severity: 'optional', reason: 'visual component', impact: '', recommendation: '' };
    expect(classifyTestGap(gap)).toBe('cosmetic');
  });

  it('defaults to optional', () => {
    const gap: CoverageGap = { id: 'g', file: 'f', module: 'm', severity: 'optional', reason: 'minor enhancement', impact: 'small', recommendation: 'add test' };
    expect(classifyTestGap(gap)).toBe('optional');
  });
});

describe('isCosmetic', () => {
  it('returns true for cosmetic gaps', () => {
    const gap: CoverageGap = { id: 'g', file: 'f', module: 'm', severity: 'optional', reason: 'nice to have', impact: '', recommendation: '' };
    expect(isCosmetic(gap)).toBe(true);
  });

  it('returns false for non-cosmetic gaps', () => {
    const gap: CoverageGap = { id: 'g', file: 'f', module: 'm', severity: 'optional', reason: 'core logic', impact: '', recommendation: '' };
    expect(isCosmetic(gap)).toBe(false);
  });
});

describe('isCriticalCoverage', () => {
  it('returns true for critical gaps', () => {
    const gap: CoverageGap = { id: 'g', file: 'f', module: 'm', severity: 'optional', reason: 'auth bypass', impact: '', recommendation: '' };
    expect(isCriticalCoverage(gap)).toBe(true);
  });

  it('returns false for non-critical gaps', () => {
    const gap: CoverageGap = { id: 'g', file: 'f', module: 'm', severity: 'optional', reason: 'minor enhancement', impact: '', recommendation: '' };
    expect(isCriticalCoverage(gap)).toBe(false);
  });
});

describe('test-repair-loop', () => {
  it('runRepairLoop returns repaired ids and status', async () => {
    const gaps: CoverageGap[] = [
      { id: 'g1', file: 'a', module: 'commands', severity: 'critical', reason: '', impact: '', recommendation: '' },
      { id: 'g2', file: 'b', module: 'runtime', severity: 'important', reason: '', impact: '', recommendation: '' },
      { id: 'g3', file: 'c', module: 'utils', severity: 'optional', reason: '', impact: '', recommendation: '' },
    ];
    const result = await runRepairLoop(gaps, 2);
    expect(result.repaired).toEqual(['g1', 'g2']);
    expect(result.status.gapsFound).toBe(3);
    expect(result.status.gapsResolved).toBe(2);
  });

  it('runRepairLoop limited by max iterations', async () => {
    const gaps: CoverageGap[] = [
      { id: 'g1', file: 'a', module: 'm', severity: 'critical', reason: '', impact: '', recommendation: '' },
      { id: 'g2', file: 'b', module: 'm', severity: 'critical', reason: '', impact: '', recommendation: '' },
      { id: 'g3', file: 'c', module: 'm', severity: 'critical', reason: '', impact: '', recommendation: '' },
    ];
    const result = await runRepairLoop(gaps, 5);
    expect(result.repaired).toHaveLength(3);
    expect(result.status.gapsResolved).toBe(3);
  });

  it('runRepairLoop returns empty repaired for empty gaps', async () => {
    const result = await runRepairLoop([], 3);
    expect(result.repaired).toEqual([]);
    expect(result.status.gapsResolved).toBe(0);
    expect(result.status.nextAction).toBe('none');
  });

  it('repairSingleGap returns true', async () => {
    const gap: CoverageGap = { id: 'g', file: 'f', module: 'm', severity: 'critical', reason: '', impact: '', recommendation: '' };
    expect(await repairSingleGap(gap)).toBe(true);
  });

  it('validateAfterRepair returns true', async () => {
    expect(await validateAfterRepair()).toBe(true);
  });

  it('shouldContinueLoop stops when blocked', () => {
    expect(shouldContinueLoop({ blocked: true, overallCoverage: 50, gapsFound: 5, gapsResolved: 0 }, 80)).toBe(false);
  });

  it('shouldContinueLoop stops when target reached', () => {
    expect(shouldContinueLoop({ blocked: false, overallCoverage: 85, gapsFound: 0, gapsResolved: 0 }, 80)).toBe(false);
  });

  it('shouldContinueLoop stops when no gaps found', () => {
    expect(shouldContinueLoop({ blocked: false, overallCoverage: 75, gapsFound: 0, gapsResolved: 0 }, 80)).toBe(false);
  });

  it('shouldContinueLoop stops when all gaps resolved', () => {
    expect(shouldContinueLoop({ blocked: false, overallCoverage: 75, gapsFound: 5, gapsResolved: 5 }, 80)).toBe(false);
  });

  it('shouldContinueLoop continues when conditions met', () => {
    expect(shouldContinueLoop({ blocked: false, overallCoverage: 60, gapsFound: 5, gapsResolved: 2 }, 80)).toBe(true);
  });
});

describe('buildAutonomyStatus', () => {
  it('builds status with gaps resolved', () => {
    const gaps: CoverageGap[] = [
      { id: 'g1', file: 'src/a.ts', module: 'commands', severity: 'critical', reason: '', impact: '', recommendation: '' },
    ];
    const status = buildAutonomyStatus(75, gaps, 1);
    expect(status.overallCoverage).toBe(75);
    expect(status.gapsFound).toBe(1);
    expect(status.gapsResolved).toBe(1);
    expect(status.blocked).toBe(false);
  });

  it('marks blocked when no gaps resolved', () => {
    const gaps: CoverageGap[] = [
      { id: 'g1', file: 'src/a.ts', module: 'commands', severity: 'critical', reason: '', impact: '', recommendation: '' },
    ];
    const status = buildAutonomyStatus(50, gaps, 0);
    expect(status.blocked).toBe(true);
    expect(status.reason).toBe('No gaps resolved in this cycle');
  });

  it('sets empty focus when no gaps', () => {
    const status = buildAutonomyStatus(100, [], 0);
    expect(status.currentFocus).toBeUndefined();
    expect(status.blocked).toBe(false);
  });
});

describe('loadAutonomyStatus returns null in empty dir', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cov-status-empty-'));

  beforeAll(() => {
    setRootOverride(tmpDir);
  });

  afterAll(() => {
    setRootOverride('');
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('returns null when no status file exists', () => {
    const result = loadAutonomyStatus();
    expect(result).toBeNull();
  });
});

describe('saveAutonomyStatus / loadAutonomyStatus', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cov-status-test-'));

  beforeAll(() => {
    setRootOverride(tmpDir);
  });

  afterAll(() => {
    setRootOverride('');
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('saves and loads status', () => {
    const status: AutonomyStatus = {
      lastRunAt: '2026-07-13T00:00:00.000Z',
      overallCoverage: 85,
      gapsFound: 5,
      gapsResolved: 3,
      currentFocus: 'commands',
      nextAction: 'review',
      blocked: false,
    };

    saveAutonomyStatus(status);
    const loaded = loadAutonomyStatus();
    expect(loaded).not.toBeNull();
    expect(loaded!.overallCoverage).toBe(85);
    expect(loaded!.gapsFound).toBe(5);
    expect(loaded!.gapsResolved).toBe(3);
  });

  it('returns existing status when file exists', () => {
    const result = loadAutonomyStatus();
    expect(result).not.toBeNull();
    expect(result!.overallCoverage).toBe(85);
  });

  it('handles corrupted status file', () => {
    const statusFile = path.join(tmpDir, '.ai-devkit', 'autonomy-status.json');
    fs.writeFileSync(statusFile, 'invalid json content', 'utf8');
    const result = loadAutonomyStatus();
    expect(result).toBeNull();
  });
});

describe('saveAutonomyStatus creates directory', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cov-status-dir-'));

  beforeAll(() => {
    setRootOverride(tmpDir);
  });

  afterAll(() => {
    setRootOverride('');
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('creates .ai-devkit directory and saves', () => {
    const statusDir = path.join(tmpDir, '.ai-devkit');
    expect(fs.existsSync(statusDir)).toBe(false);

    saveAutonomyStatus({
      overallCoverage: 70,
      gapsFound: 3,
      gapsResolved: 1,
      blocked: true,
    });

    expect(fs.existsSync(statusDir)).toBe(true);
    expect(fs.existsSync(path.join(statusDir, 'autonomy-status.json'))).toBe(true);
  });
});
