import {
  GapPrioritizer,
  getGapPrioritizer,
  scoreGap,
  prioritizeGaps,
  rankBySeverity,
} from '../gap-prioritizer';
import type { CoverageGap } from '../types';

function makeGap(
  id: string,
  severity: CoverageGap['severity'] = 'critical',
  module = 'core',
): CoverageGap {
  return {
    id,
    file: `src/${module}/${id}.ts`,
    module,
    severity,
    reason: 'No tests',
    impact: 'Low coverage',
    recommendation: 'Add tests',
  };
}

describe('GapPrioritizer', () => {
  let prioritizer: GapPrioritizer;

  beforeEach(() => {
    prioritizer = new GapPrioritizer();
  });

  describe('constructor', () => {
    it('creates with default weights', () => {
      expect(prioritizer.getWeights()).toEqual({
        critical: 100,
        important: 70,
        optional: 40,
        cosmetic: 10,
      });
    });

    it('accepts partial custom weights', () => {
      const p = new GapPrioritizer({ critical: 200 });
      expect(p.getWeights().critical).toBe(200);
      expect(p.getWeights().important).toBe(70);
    });

    it('accepts all custom weights', () => {
      const p = new GapPrioritizer({ critical: 1, important: 2, optional: 3, cosmetic: 4 });
      expect(p.getWeights()).toEqual({ critical: 1, important: 2, optional: 3, cosmetic: 4 });
    });
  });

  describe('scoreGap', () => {
    it('returns 100 for critical', () => {
      expect(prioritizer.scoreGap(makeGap('1', 'critical'))).toBe(100);
    });
    it('returns 70 for important', () => {
      expect(prioritizer.scoreGap(makeGap('1', 'important'))).toBe(70);
    });
    it('returns 40 for optional', () => {
      expect(prioritizer.scoreGap(makeGap('1', 'optional'))).toBe(40);
    });
    it('returns 10 for cosmetic', () => {
      expect(prioritizer.scoreGap(makeGap('1', 'cosmetic'))).toBe(10);
    });
    it('returns 0 for unknown severity', () => {
      const gap = makeGap('1', 'critical');
      Object.assign(gap, { severity: 'unknown' as any });
      expect(prioritizer.scoreGap(gap)).toBe(0);
    });
  });

  describe('prioritizeGaps', () => {
    it('sorts gaps by severity descending', () => {
      const gaps = [
        makeGap('a', 'optional'),
        makeGap('b', 'critical'),
        makeGap('c', 'important'),
        makeGap('d', 'cosmetic'),
      ];
      const sorted = prioritizer.prioritizeGaps(gaps);
      expect(sorted.map(g => g.id)).toEqual(['b', 'c', 'a', 'd']);
    });

    it('handles empty array', () => {
      expect(prioritizer.prioritizeGaps([])).toEqual([]);
    });

    it('handles single element', () => {
      expect(prioritizer.prioritizeGaps([makeGap('x', 'cosmetic')])).toHaveLength(1);
    });

    it('does not mutate original array', () => {
      const gaps = [makeGap('a', 'cosmetic'), makeGap('b', 'critical')];
      const sorted = prioritizer.prioritizeGaps(gaps);
      expect(gaps[0].id).toBe('a');
      expect(sorted[0].id).toBe('b');
    });

    it('preserves severity order within same level', () => {
      const gaps = [
        makeGap('a', 'important'),
        makeGap('b', 'important'),
      ];
      const sorted = prioritizer.prioritizeGaps(gaps);
      expect(sorted[0].id).toBe('a');
      expect(sorted[1].id).toBe('b');
    });
  });

  describe('rankBySeverity', () => {
    it('groups gaps by severity', () => {
      const gaps = [
        makeGap('c1', 'critical'),
        makeGap('c2', 'critical'),
        makeGap('i1', 'important'),
        makeGap('o1', 'optional'),
        makeGap('x1', 'cosmetic'),
      ];
      const ranked = prioritizer.rankBySeverity(gaps);
      expect(ranked.critical).toHaveLength(2);
      expect(ranked.important).toHaveLength(1);
      expect(ranked.optional).toHaveLength(1);
      expect(ranked.cosmetic).toHaveLength(1);
    });

    it('handles empty array', () => {
      const ranked = prioritizer.rankBySeverity([]);
      expect(ranked.critical).toEqual([]);
      expect(ranked.important).toEqual([]);
      expect(ranked.optional).toEqual([]);
      expect(ranked.cosmetic).toEqual([]);
    });

    it('ignores gaps with unknown severity', () => {
      const gap = makeGap('x', 'critical');
      Object.assign(gap, { severity: 'unknown' as any });
      const ranked = prioritizer.rankBySeverity([gap]);
      expect(ranked.critical).toHaveLength(0);
      expect(ranked.important).toHaveLength(0);
      expect(ranked.optional).toHaveLength(0);
      expect(ranked.cosmetic).toHaveLength(0);
    });
  });

  describe('updateWeights / getWeights', () => {
    it('merges with existing weights', () => {
      prioritizer.updateWeights({ critical: 50, cosmetic: 5 });
      expect(prioritizer.getWeights()).toEqual({ critical: 50, important: 70, optional: 40, cosmetic: 5 });
    });

    it('getWeights returns a copy, not a reference', () => {
      const w = prioritizer.getWeights();
      w.critical = 0;
      expect(prioritizer.getWeights().critical).toBe(100);
    });

    it('updateWeights with empty object does nothing', () => {
      prioritizer.updateWeights({});
      expect(prioritizer.getWeights()).toEqual({ critical: 100, important: 70, optional: 40, cosmetic: 10 });
    });
  });

  describe('repair history', () => {
    const record = {
      gapId: 'g1',
      file: 'src/core/test.ts',
      module: 'core',
      severity: 'critical' as const,
      attemptedAt: new Date().toISOString(),
      success: true,
      durationMs: 100,
      repairStrategy: 'generate-test',
    };

    it('records and retrieves repairs', () => {
      prioritizer.recordRepair(record);
      expect(prioritizer.getRepairHistory()).toHaveLength(1);
      expect(prioritizer.getRepairHistory()[0].gapId).toBe('g1');
    });

    it('records multiple repairs', () => {
      prioritizer.recordRepair(record);
      prioritizer.recordRepair({ ...record, gapId: 'g2' });
      expect(prioritizer.getRepairHistory()).toHaveLength(2);
    });

    it('getRepairHistory returns a copy', () => {
      prioritizer.recordRepair(record);
      const h = prioritizer.getRepairHistory();
      h.pop();
      expect(prioritizer.getRepairHistory()).toHaveLength(1);
    });

    it('getRepairSuccessRate returns 0 when no history', () => {
      expect(prioritizer.getRepairSuccessRate()).toBe(0);
    });

    it('getRepairSuccessRate computes correct ratio', () => {
      prioritizer.recordRepair({ ...record, gapId: 'g1', success: true });
      prioritizer.recordRepair({ ...record, gapId: 'g2', success: false });
      prioritizer.recordRepair({ ...record, gapId: 'g3', success: true });
      expect(prioritizer.getRepairSuccessRate()).toBeCloseTo(2 / 3, 5);
    });

    it('getRepairSuccessRate returns 1 when all succeed', () => {
      prioritizer.recordRepair({ ...record, gapId: 'g1', success: true });
      prioritizer.recordRepair({ ...record, gapId: 'g2', success: true });
      expect(prioritizer.getRepairSuccessRate()).toBe(1);
    });

    it('getRepairsByModule filters correctly', () => {
      prioritizer.recordRepair({ ...record, gapId: 'g1', module: 'core' });
      prioritizer.recordRepair({ ...record, gapId: 'g2', module: 'commands' });
      prioritizer.recordRepair({ ...record, gapId: 'g3', module: 'core' });
      expect(prioritizer.getRepairsByModule('core')).toHaveLength(2);
      expect(prioritizer.getRepairsByModule('commands')).toHaveLength(1);
      expect(prioritizer.getRepairsByModule('unknown')).toHaveLength(0);
    });
  });
});

describe('standalone functions (singleton-based)', () => {
  beforeEach(() => {
    getGapPrioritizer(); // ensure initialized
  });

  it('scoreGap delegates to default prioritizer', () => {
    expect(scoreGap(makeGap('g', 'critical'))).toBe(100);
    expect(scoreGap(makeGap('g', 'cosmetic'))).toBe(10);
  });

  it('prioritizeGaps returns sorted array via singleton', () => {
    const gaps = [
      makeGap('a', 'cosmetic'),
      makeGap('b', 'critical'),
    ];
    const sorted = prioritizeGaps(gaps);
    expect(sorted[0].id).toBe('b');
    expect(sorted[1].id).toBe('a');
  });

  it('rankBySeverity groups via singleton', () => {
    const gaps = [
      makeGap('a', 'critical'),
      makeGap('b', 'optional'),
      makeGap('c', 'critical'),
    ];
    const ranked = rankBySeverity(gaps);
    expect(ranked.critical).toHaveLength(2);
    expect(ranked.optional).toHaveLength(1);
  });
});
