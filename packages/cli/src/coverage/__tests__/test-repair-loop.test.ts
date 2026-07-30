const mockClassifyQuality = jest.fn();

jest.mock('../../quality/test-quality-classifier', () => ({
  TestQualityClassifier: jest.fn().mockImplementation(() => ({
    classifyTestQuality: mockClassifyQuality,
    getRepairSuccessRate: jest.fn().mockReturnValue(0.8),
    getClassificationPrecision: jest.fn().mockReturnValue(0.95),
    getFalseNegativeRate: jest.fn().mockReturnValue(0.02),
    isRepairThresholdMet: jest.fn().mockReturnValue(true),
    isPrecisionThresholdMet: jest.fn().mockReturnValue(true),
    isFalseNegativeThresholdMet: jest.fn().mockReturnValue(true),
    recordClassification: jest.fn(),
    getMetrics: jest.fn().mockReturnValue({ truePositives: 4, falsePositives: 0, trueNegatives: 1, falseNegatives: 0 }),
  })),
}));

import {
  runRepairLoop,
  repairSingleGap,
  validateAfterRepair,
  shouldContinueLoop,
} from '../test-repair-loop';
import type { CoverageGap, AutonomyStatus } from '../types';

function makeGap(
  id: string,
  severity: CoverageGap['severity'] = 'critical',
  module = 'core',
): CoverageGap {
  return {
    id,
    file: `src/core/${id}.ts`,
    module,
    severity,
    reason: 'missing tests',
    impact: 'low coverage',
    recommendation: 'add tests',
  };
}

describe('runRepairLoop', () => {
  beforeEach(() => {
    mockClassifyQuality.mockReset();
  });

  it('returns empty result when no gaps provided', async () => {
    const result = await runRepairLoop([], 3);
    expect(result.repaired).toEqual([]);
    expect(result.attempts).toHaveLength(0);
    expect(result.qualityGains).toEqual([]);
    expect(result.status.gapsFound).toBe(0);
    expect(result.status.gapsResolved).toBe(0);
  });

  it('repairs gaps when classifyTestQuality returns missing', async () => {
    mockClassifyQuality.mockResolvedValue({ level: 'missing' });

    const gaps = [makeGap('g1', 'critical'), makeGap('g2', 'optional')];
    const result = await runRepairLoop(gaps, 3);

    expect(result.repaired).toHaveLength(2);
    expect(result.attempts).toHaveLength(2);
    expect(result.attempts[0].success).toBe(true);
    expect(result.attempts[0].strategy).toBe('generate-test');
    expect(result.status.gapsResolved).toBe(2);
  });

  it('repairs with improve-test strategy for needs_improvement quality', async () => {
    mockClassifyQuality.mockResolvedValue({ level: 'needs_improvement' });

    const result = await runRepairLoop([makeGap('g1')], 3);
    expect(result.attempts[0].success).toBe(true);
    expect(result.attempts[0].strategy).toBe('improve-test');
  });

  it('skips gaps when quality is already adequate', async () => {
    mockClassifyQuality.mockResolvedValue({ level: 'good' });

    const result = await runRepairLoop([makeGap('g1')], 3);
    expect(result.repaired).toHaveLength(0);
    expect(result.attempts[0].success).toBe(false);
    expect(result.attempts[0].error).toBe('Test quality already adequate');
  });

  it('skips gaps with excellent quality', async () => {
    mockClassifyQuality.mockResolvedValue({ level: 'excellent' });

    const result = await runRepairLoop([makeGap('g1')], 3);
    expect(result.repaired).toHaveLength(0);
    expect(result.attempts[0].success).toBe(false);
  });

  it('handles repair failure when classifyTestQuality throws', async () => {
    mockClassifyQuality.mockRejectedValue(new Error('Read error'));

    const result = await runRepairLoop([makeGap('g1')], 3);
    expect(result.repaired).toHaveLength(0);
    expect(result.attempts[0].success).toBe(false);
    expect(result.attempts[0].error).toBe('Error: Read error');
  });

  it('respects maxIterations limit', async () => {
    mockClassifyQuality.mockResolvedValue({ level: 'poor' });

    const gaps = [makeGap('g1'), makeGap('g2'), makeGap('g3')];
    const result = await runRepairLoop(gaps, 1);
    expect(result.attempts).toHaveLength(1);
    expect(result.repaired).toHaveLength(1);
  });

  it('records repair in prioritizer history on success', async () => {
    mockClassifyQuality.mockResolvedValue({ level: 'missing' });

    const gaps = [makeGap('g1', 'critical')];
    const result = await runRepairLoop(gaps, 3);
    expect(result.repaired).toContain('g1');
    expect(result.attempts[0].durationMs).toBeGreaterThanOrEqual(0);
  });

  it('sets status fields correctly', async () => {
    mockClassifyQuality.mockResolvedValue({ level: 'poor' });

    const gaps = [makeGap('g1', 'critical', 'core'), makeGap('g2', 'important', 'commands')];
    const result = await runRepairLoop(gaps, 3);

    expect(result.status.lastRunAt).toBeDefined();
    expect(result.status.overallCoverage).toBeGreaterThan(0);
    expect(result.status.gapsFound).toBe(2);
    expect(result.status.gapsResolved).toBe(2);
    expect(result.status.blocked).toBe(false);
  });
});

describe('repairSingleGap', () => {
  beforeEach(() => {
    mockClassifyQuality.mockReset();
  });

  it('returns true on successful repair', async () => {
    mockClassifyQuality.mockResolvedValue({ level: 'missing' });
    const result = await repairSingleGap(makeGap('g1'));
    expect(result).toBe(true);
  });

  it('returns false when classifyTestQuality throws', async () => {
    mockClassifyQuality.mockRejectedValue(new Error('Failed'));
    const result = await repairSingleGap(makeGap('g1'));
    expect(result).toBe(false);
  });

  it('returns false when quality is adequate', async () => {
    mockClassifyQuality.mockResolvedValue({ level: 'good' });
    const result = await repairSingleGap(makeGap('g1'));
    expect(result).toBe(false);
  });
});

describe('validateAfterRepair', () => {
  it('returns true when classifier reports thresholds met', async () => {
    const mockClassifier = {
      isRepairThresholdMet: jest.fn().mockReturnValue(true),
      isPrecisionThresholdMet: jest.fn().mockReturnValue(true),
      isFalseNegativeThresholdMet: jest.fn().mockReturnValue(true),
    } as any;
    expect(await validateAfterRepair(mockClassifier)).toBe(true);
  });

  it('returns false when repair threshold not met', async () => {
    const mockClassifier = {
      isRepairThresholdMet: jest.fn().mockReturnValue(false),
      isPrecisionThresholdMet: jest.fn().mockReturnValue(true),
      isFalseNegativeThresholdMet: jest.fn().mockReturnValue(true),
    } as any;
    expect(await validateAfterRepair(mockClassifier)).toBe(false);
  });
});

describe('shouldContinueLoop', () => {
  const baseStatus: AutonomyStatus = {
    gapsFound: 5,
    gapsResolved: 2,
    overallCoverage: 50,
    blocked: false,
  };

  it('returns true when conditions are met', () => {
    expect(shouldContinueLoop(baseStatus, 80)).toBe(true);
  });

  it('returns false when blocked', () => {
    expect(shouldContinueLoop({ ...baseStatus, blocked: true }, 80)).toBe(false);
  });

  it('returns false when coverage target reached', () => {
    expect(shouldContinueLoop({ ...baseStatus, overallCoverage: 85 }, 80)).toBe(false);
  });

  it('returns false when no gaps found', () => {
    expect(shouldContinueLoop({ ...baseStatus, gapsFound: 0, gapsResolved: 0 }, 80)).toBe(false);
  });

  it('returns false when all gaps resolved', () => {
    expect(shouldContinueLoop({ ...baseStatus, gapsFound: 5, gapsResolved: 5 }, 80)).toBe(false);
  });

  it('returns false when coverage is exactly at target', () => {
    expect(shouldContinueLoop({ ...baseStatus, overallCoverage: 80 }, 80)).toBe(false);
  });

  it('handles zero gaps resolved with gaps present (not blocked)', () => {
    expect(shouldContinueLoop({ ...baseStatus, gapsFound: 3, gapsResolved: 0, blocked: false, overallCoverage: 0 }, 80)).toBe(true);
  });
});
