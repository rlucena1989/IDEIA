import {
  calcScore,
  level,
  overallScore,
  shieldColor,
  generateBadge,
  buildRecommendations,
  buildAlerts,
  crossCategoryAnalysis,
  generateFromTemplate,
  validateYamlContent,
  scoreDiffExport,
} from '../scorecard';
import type { ScorecardItem, ScorecardCategory, ScorecardResult } from '../scorecard-types';

function makeItem(overrides: Partial<ScorecardItem> = {}): ScorecardItem {
  return { id: 'test', description: 'test item', passed: true, weight: 1, ...overrides };
}

function makeCategory(overrides: Partial<ScorecardCategory> = {}): ScorecardCategory {
  const items = overrides.items ?? [makeItem()];
  return {
    name: 'Test',
    weight: 100,
    score: calcScore(items),
    maxScore: 100,
    items,
    ...overrides,
  };
}

describe('calcScore', () => {
  it('returns 100 when all items pass', () => {
    const items = [makeItem({ id: 'a', passed: true, weight: 1 }), makeItem({ id: 'b', passed: true, weight: 3 })];
    expect(calcScore(items)).toBe(100);
  });

  it('returns 0 when no items pass', () => {
    const items = [makeItem({ id: 'a', passed: false, weight: 1 })];
    expect(calcScore(items)).toBe(0);
  });

  it('calculates proportional score', () => {
    const items = [makeItem({ id: 'a', passed: true, weight: 2 }), makeItem({ id: 'b', passed: false, weight: 2 })];
    expect(calcScore(items)).toBe(50);
  });

  it('returns 0 for empty items', () => {
    expect(calcScore([])).toBe(0);
  });
});

describe('level', () => {
  it('returns A for score >= 90', () => { expect(level(95)).toBe('A'); });
  it('returns B for score >= 70', () => { expect(level(75)).toBe('B'); });
  it('returns C for score >= 50', () => { expect(level(55)).toBe('C'); });
  it('returns D for score < 50', () => { expect(level(30)).toBe('D'); });
});

describe('overallScore', () => {
  it('computes weighted average', () => {
    const cats = [
      makeCategory({ name: 'A', weight: 60, score: 100 }),
      makeCategory({ name: 'B', weight: 40, score: 0 }),
    ];
    expect(overallScore(cats)).toBe(60);
  });

  it('returns 0 when total weight is 0', () => {
    expect(overallScore([makeCategory({ weight: 0, score: 50 })])).toBe(0);
  });
});

describe('shieldColor', () => {
  it('returns brightgreen for score >= 90', () => { expect(shieldColor(95)).toBe('brightgreen'); });
  it('returns yellow for score >= 70', () => { expect(shieldColor(75)).toBe('yellow'); });
  it('returns orange for score >= 50', () => { expect(shieldColor(55)).toBe('orange'); });
  it('returns red for score < 50', () => { expect(shieldColor(30)).toBe('red'); });
});

describe('generateBadge', () => {
  it('returns SVG string', () => {
    const svg = generateBadge(85);
    expect(svg).toContain('<svg');
    expect(svg).toContain('85/100');
    expect(svg).toContain('#dfb317');
  });

  it('handles score 0', () => {
    const svg = generateBadge(0);
    expect(svg).toContain('0/100');
    expect(svg).toContain('#e05d44');
  });
});

describe('buildRecommendations', () => {
  it('returns recommendations for failed items', () => {
    const items = [makeItem({ id: 'f1', description: 'Failed check', passed: false, weight: 2, hint: 'fix it' })];
    const cats = [makeCategory({ items })];
    const recs = buildRecommendations(cats);
    expect(recs).toHaveLength(1);
    expect(recs[0].text).toContain('Failed check');
    expect(recs[0].text).toContain('fix it');
  });

  it('returns empty array when all pass', () => {
    const cats = [makeCategory({ items: [makeItem({ passed: true })] })];
    expect(buildRecommendations(cats)).toHaveLength(0);
  });
});

describe('buildAlerts', () => {
  it('creates alerts for high-weight failed items', () => {
    const items = [makeItem({ id: 'a1', description: 'Critical failure', passed: false, weight: 5 })];
    const cats = [makeCategory({ items })];
    const alerts = buildAlerts(cats);
    expect(alerts).toHaveLength(1);
    expect(alerts[0].severity).toBe('error');
    expect(alerts[0].message).toContain('Critical failure');
  });

  it('ignores low-weight failed items', () => {
    const items = [makeItem({ passed: false, weight: 1 })];
    const cats = [makeCategory({ items })];
    expect(buildAlerts(cats)).toHaveLength(0);
  });
});

describe('crossCategoryAnalysis', () => {
  function makeResult(overrides: Partial<ScorecardCategory>[]): ScorecardResult {
    const cats = overrides.map((o, i) => makeCategory({ name: o.name ?? `Cat${i}`, weight: o.weight ?? 100, score: o.score ?? 100 }));
    return {
      timestamp: new Date().toISOString(),
      overallScore: 50,
      maturityLevel: 'C' as const,
      categories: cats,
      recommendations: [],
      evolution: { version: '1', categories: cats.length, items: cats.reduce((s, c) => s + c.items.length, 0) },
      trends: [],
      alerts: [],
      correlationAlerts: [],
      forecast: { forecast: 50, confidence: 'low' as const, trend: 'stable' as const, history: [] },
      git: { branch: 'main', commit: 'abc1234', message: 'test' },
      meta: { durationMs: 10, scorecardVersion: '1' },
    };
  }

  it('detects security+quality both low', () => {
    const result = makeResult([
      { name: 'Segurança', score: 30 },
      { name: 'Qualidade', score: 40 },
    ]);
    const alerts = crossCategoryAnalysis(result);
    expect(alerts.some(a => a.severity === 'critical' && a.message.includes('Segurança e Qualidade ambos baixos'))).toBe(true);
  });

  it('detects security+quality both high', () => {
    const result = makeResult([
      { name: 'Segurança', score: 95 },
      { name: 'Qualidade', score: 92 },
    ]);
    const alerts = crossCategoryAnalysis(result);
    expect(alerts.some(a => a.severity === 'info' && a.message.includes('Segurança e Qualidade em nível alto'))).toBe(true);
  });

  it('warns when ecosystem health is critical', () => {
    const result = makeResult([
      { name: 'Saúde do Ecossistema', score: 30 },
    ]);
    const alerts = crossCategoryAnalysis(result);
    expect(alerts.some(a => a.severity === 'warn' && a.message.includes('Saúde do Ecossistema crítica'))).toBe(true);
  });
});

describe('generateFromTemplate', () => {
  it('generates security-policy template', () => {
    const result = generateFromTemplate('security-policy', { version: '1.0', agents: 'agent1', network: 'isolated', secrets: 'managed' });
    expect(result).toContain('Política de Segurança');
    expect(result).toContain('1.0');
    expect(result).toContain('agent1');
  });

  it('generates architecture-adr template', () => {
    const result = generateFromTemplate('architecture-adr', { title: 'Use PostgreSQL', status: 'approved', context: 'Need persistence', decision: 'Use pgvector' });
    expect(result).toContain('ADR: Use PostgreSQL');
    expect(result).toContain('approved');
    expect(result).toContain('Use pgvector');
  });

  it('generates quality-dod template', () => {
    const result = generateFromTemplate('quality-dod', { project: 'IDEIA' });
    expect(result).toContain('IDEIA');
    expect(result).toContain('Definition of Done');
  });

  it('returns fallback for unknown template', () => {
    const result = generateFromTemplate('unknown', {});
    expect(result).toBe('Template não encontrado.');
  });
});

describe('validateYamlContent', () => {
  it('reports missing keys when file cannot be read', () => {
    const result = validateYamlContent('/nonexistent/file.yaml', ['version', 'name']);
    expect(result.valid).toBe(false);
    expect(result.missing).toEqual(['version', 'name']);
  });
});

describe('scoreDiffExport', () => {
  it('computes category-level diff between two results', () => {
    const r1: ScorecardResult = {
      timestamp: '2026-01-01T00:00:00.000Z', overallScore: 70, maturityLevel: 'B',
      categories: [makeCategory({ name: 'Segurança', weight: 50, score: 60 })],
      recommendations: [], evolution: { version: '1', categories: 1, items: 1 },
      trends: [], alerts: [], correlationAlerts: [],
      forecast: { forecast: 70, confidence: 'low', trend: 'stable', history: [] },
      git: { branch: 'main', commit: 'a', message: 'm' },
      meta: { durationMs: 5, scorecardVersion: '1' },
    };
    const r2: ScorecardResult = {
      timestamp: '2026-01-02T00:00:00.000Z', overallScore: 80, maturityLevel: 'B',
      categories: [makeCategory({ name: 'Segurança', weight: 50, score: 80 })],
      recommendations: [], evolution: { version: '1', categories: 1, items: 1 },
      trends: [], alerts: [], correlationAlerts: [],
      forecast: { forecast: 80, confidence: 'low', trend: 'stable', history: [] },
      git: { branch: 'main', commit: 'b', message: 'm' },
      meta: { durationMs: 5, scorecardVersion: '1' },
    };
    const diff = JSON.parse(scoreDiffExport(r1, r2));
    expect(diff.categories.Segurança.from).toBe(60);
    expect(diff.categories.Segurança.to).toBe(80);
    expect(diff.categories.Segurança.diff).toBe(20);
  });
});
