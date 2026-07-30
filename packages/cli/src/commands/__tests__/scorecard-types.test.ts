import type { ScorecardItem, ScorecardCategory, ScorecardTrend, ScorecardAlert, CorrelationAlert, ScorecardResult } from '../scorecard-types';

describe('ScorecardItem', () => {
  it('can be constructed with minimal fields', () => {
    const item: ScorecardItem = { id: 'T1', description: 'test', passed: true, weight: 1 };
    expect(item.id).toBe('T1');
    expect(item.description).toBe('test');
    expect(item.passed).toBe(true);
    expect(item.weight).toBe(1);
  });

  it('can be constructed with optional fields', () => {
    const item: ScorecardItem = { id: 'T2', description: 'with options', passed: false, weight: 5, hint: 'fix it', fixCommand: 'npm test', value: '42' };
    expect(item.hint).toBe('fix it');
    expect(item.fixCommand).toBe('npm test');
    expect(item.value).toBe('42');
  });

  it('allows value as number', () => {
    const item: ScorecardItem = { id: 'T3', description: 'numeric', passed: true, weight: 1, value: 100 };
    expect(typeof item.value).toBe('number');
  });

  it('accepts different passed values', () => {
    const t: ScorecardItem = { id: 'a', description: 'pass', passed: true, weight: 1 };
    const f: ScorecardItem = { id: 'b', description: 'fail', passed: false, weight: 1 };
    expect(t.passed).toBe(true);
    expect(f.passed).toBe(false);
  });

  it('handles zero weight', () => {
    const item: ScorecardItem = { id: 'Z', description: 'zero', passed: true, weight: 0 };
    expect(item.weight).toBe(0);
  });
});

describe('ScorecardCategory', () => {
  it('can be constructed with items', () => {
    const items: ScorecardItem[] = [
      { id: 'a', description: 'item a', passed: true, weight: 1 },
    ];
    const cat: ScorecardCategory = { name: 'Security', weight: 50, score: 80, maxScore: 100, items };
    expect(cat.name).toBe('Security');
    expect(cat.score).toBe(80);
    expect(cat.items).toHaveLength(1);
  });

  it('can have empty items', () => {
    const cat: ScorecardCategory = { name: 'Empty', weight: 0, score: 0, maxScore: 0, items: [] };
    expect(cat.items).toHaveLength(0);
  });

  it('supports zero score and weight', () => {
    const cat: ScorecardCategory = { name: 'None', weight: 0, score: 0, maxScore: 100, items: [] };
    expect(cat.weight).toBe(0);
    expect(cat.score).toBe(0);
  });
});

describe('ScorecardTrend', () => {
  it('can be constructed', () => {
    const trend: ScorecardTrend = { timestamp: '2026-07-26T12:00:00.000Z', overallScore: 75, categories: [{ name: 'Test', score: 75 }] };
    expect(trend.timestamp).toContain('2026');
    expect(trend.overallScore).toBe(75);
  });

  it('supports empty categories', () => {
    const trend: ScorecardTrend = { timestamp: '', overallScore: 0, categories: [] };
    expect(trend.categories).toHaveLength(0);
  });
});

describe('ScorecardAlert', () => {
  it('can be constructed with warn severity', () => {
    const alert: ScorecardAlert = { category: 'Security', item: 'T1', severity: 'warn', message: 'warning' };
    expect(alert.severity).toBe('warn');
  });

  it('can be constructed with error severity', () => {
    const alert: ScorecardAlert = { category: 'Quality', item: 'T2', severity: 'error', message: 'error!' };
    expect(alert.severity).toBe('error');
  });
});

describe('CorrelationAlert', () => {
  it('can be constructed with all severities', () => {
    const info: CorrelationAlert = { severity: 'info', message: 'info', categories: ['A'] };
    const warn: CorrelationAlert = { severity: 'warn', message: 'warn', categories: ['B'] };
    const crit: CorrelationAlert = { severity: 'critical', message: 'critical', categories: ['C'] };
    expect(info.severity).toBe('info');
    expect(warn.severity).toBe('warn');
    expect(crit.severity).toBe('critical');
  });

  it('can have multiple categories', () => {
    const alert: CorrelationAlert = { severity: 'warn', message: 'multi', categories: ['A', 'B', 'C'] };
    expect(alert.categories).toHaveLength(3);
  });
});

describe('ScorecardResult', () => {
  it('can be fully constructed', () => {
    const result: ScorecardResult = {
      timestamp: '2026-07-26T12:00:00.000Z',
      overallScore: 85,
      maturityLevel: 'A',
      categories: [],
      recommendations: [],
      evolution: { version: '18.0', categories: 0, items: 0 },
      trends: [],
      alerts: [],
      correlationAlerts: [],
      forecast: { forecast: 85, confidence: 'medium', trend: 'stable', history: [] },
      git: { branch: 'main', commit: 'abc1234', message: 'test' },
      meta: { durationMs: 100, scorecardVersion: '18.0' },
    };
    expect(result.maturityLevel).toBe('A');
    expect(result.forecast.confidence).toBe('medium');
    expect(result.git.branch).toBe('main');
    expect(result.meta.durationMs).toBe(100);
  });

  it('supports all maturity levels', () => {
    const levels: Array<'A' | 'B' | 'C' | 'D'> = ['A', 'B', 'C', 'D'];
    for (const l of levels) {
      const r: ScorecardResult = {
        timestamp: '', overallScore: 0, maturityLevel: l,
        categories: [], recommendations: [], evolution: { version: '', categories: 0, items: 0 },
        trends: [], alerts: [], correlationAlerts: [],
        forecast: { forecast: 0, confidence: 'low', trend: 'stable', history: [] },
        git: { branch: '', commit: '', message: '' },
        meta: { durationMs: 0, scorecardVersion: '' },
      };
      expect(r.maturityLevel).toBe(l);
    }
  });

  it('supports no-git scenario', () => {
    const result: ScorecardResult = {
      timestamp: '', overallScore: 0, maturityLevel: 'D',
      categories: [], recommendations: [], evolution: { version: '', categories: 0, items: 0 },
      trends: [], alerts: [], correlationAlerts: [],
      forecast: { forecast: 0, confidence: 'low', trend: 'stable', history: [] },
      git: { branch: 'no-git', commit: '0000000', message: 'not a git repository' },
      meta: { durationMs: 0, scorecardVersion: '' },
    };
    expect(result.git.branch).toBe('no-git');
  });
});
