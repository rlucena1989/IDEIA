import type { ScorecardResult, ScorecardCategory, ScorecardItem, CorrelationAlert } from '../scorecard-types';

const mockCwd = jest.fn().mockReturnValue('/test/project');
const mockRead = jest.fn();
const mockReadDir = jest.fn();
const mockExists = jest.fn();
const mockStat = jest.fn();
const mockWrite = jest.fn();
const mockMkDir = jest.fn();

jest.mock('../../io', () => ({
  getIO: jest.fn(() => ({
    fs: {
      cwd: mockCwd,
      read: mockRead,
      readDir: mockReadDir,
      exists: mockExists,
      stat: mockStat,
      write: mockWrite,
      mkDir: mockMkDir,
    },
  })),
}));

jest.mock('node:child_process', () => ({
  spawnSync: jest.fn(),
}));

import {
  crossCategoryAnalysis, buildTrends, forecastScore,
  overallScore, buildRecommendations, buildAlerts,
  buildAIAnalysisPrompt, scoreDiffExport,
} from '../scorecard-analysis';

const makeItem = (overrides: Partial<ScorecardItem> = {}): ScorecardItem => ({
  id: 'T1', description: 'test item', passed: true, weight: 10, ...overrides,
});

const makeCat = (overrides: Partial<ScorecardCategory> = {}): ScorecardCategory => ({
  name: 'Test', weight: 50, score: 80, maxScore: 100, items: [makeItem()], ...overrides,
});

const baseResult = (overrides: Partial<ScorecardResult> = {}): ScorecardResult => ({
  timestamp: '2026-07-26T12:00:00.000Z',
  overallScore: 75,
  maturityLevel: 'B',
  categories: [makeCat()],
  recommendations: [{ text: 'fix test' }],
  evolution: { version: '18.0', categories: 1, items: 5 },
  trends: [],
  alerts: [],
  correlationAlerts: [],
  forecast: { forecast: 75, confidence: 'medium', trend: 'stable', history: [70, 75] },
  git: { branch: 'main', commit: 'abc1234', message: 'test' },
  meta: { durationMs: 100, scorecardVersion: '18.0' },
  ...overrides,
});

describe('crossCategoryAnalysis', () => {
  it('returns critical alert when security and quality are low', () => {
    const result = baseResult({
      categories: [
        makeCat({ name: 'Segurança', score: 40, weight: 50 }),
        makeCat({ name: 'Qualidade', score: 30, weight: 50 }),
        makeCat({ name: 'Saúde do Ecossistema', score: 80, weight: 50 }),
      ],
    });
    const alerts = crossCategoryAnalysis(result);
    expect(alerts.some(a => a.severity === 'critical')).toBe(true);
    expect(alerts.some(a => a.message.includes('Segurança e Qualidade ambos baixos'))).toBe(true);
  });

  it('returns warn when ecosystem is critical', () => {
    const result = baseResult({
      categories: [
        makeCat({ name: 'Segurança', score: 80, weight: 50 }),
        makeCat({ name: 'Qualidade', score: 80, weight: 50 }),
        makeCat({ name: 'Saúde do Ecossistema', score: 30, weight: 50 }),
      ],
    });
    const alerts = crossCategoryAnalysis(result);
    expect(alerts.some(a => a.severity === 'warn')).toBe(true);
    expect(alerts.some(a => a.message.includes('Saúde do Ecossistema crítica'))).toBe(true);
  });

  it('returns info when security and quality are high', () => {
    const result = baseResult({
      categories: [
        makeCat({ name: 'Segurança', score: 95, weight: 50 }),
        makeCat({ name: 'Qualidade', score: 95, weight: 50 }),
      ],
    });
    const alerts = crossCategoryAnalysis(result);
    expect(alerts.some(a => a.severity === 'info' && a.message.includes('Segurança e Qualidade em nível alto'))).toBe(true);
  });

  it('returns empty when no specific categories match', () => {
    const result = baseResult({
      categories: [makeCat({ name: 'Unrelated', score: 50, weight: 100 })],
    });
    expect(crossCategoryAnalysis(result)).toHaveLength(0);
  });

  it('returns info when integrity and pipeline are 100', () => {
    const result = baseResult({
      categories: [
        makeCat({ name: 'Integridade do Projeto', score: 100, weight: 50 }),
        makeCat({ name: 'Pipeline Health', score: 100, weight: 50 }),
      ],
    });
    const alerts = crossCategoryAnalysis(result);
    expect(alerts.some(a => a.message.includes('Integridade e Pipeline saudáveis'))).toBe(true);
  });
});

describe('buildTrends', () => {
  it('returns empty for empty history', () => {
    expect(buildTrends([])).toEqual([]);
  });

  it('builds trend entries from history', () => {
    const history = [
      baseResult({ timestamp: '2026-07-01T00:00:00.000Z', overallScore: 70 }),
      baseResult({ timestamp: '2026-07-02T00:00:00.000Z', overallScore: 80 }),
    ];
    const trends = buildTrends(history);
    expect(trends).toHaveLength(2);
    expect(trends[0].timestamp).toBe('2026-07-01T00:00:00.000Z');
    expect(trends[0].overallScore).toBe(70);
    expect(trends[1].overallScore).toBe(80);
  });

  it('limits to 20 entries', () => {
    const history = Array.from({ length: 25 }, (_, i) => baseResult({ overallScore: i }));
    expect(buildTrends(history)).toHaveLength(20);
  });
});

describe('overallScore', () => {
  it('computes weighted average', () => {
    const cats = [
      makeCat({ name: 'A', weight: 60, score: 100 }),
      makeCat({ name: 'B', weight: 40, score: 0 }),
    ];
    expect(overallScore(cats)).toBe(60);
  });

  it('returns 0 when total weight is 0', () => {
    expect(overallScore([makeCat({ weight: 0, score: 50 })])).toBe(0);
  });

  it('returns 0 for empty categories', () => {
    expect(overallScore([])).toBe(0);
  });

  it('handles equal weights', () => {
    const cats = [
      makeCat({ name: 'A', weight: 50, score: 100 }),
      makeCat({ name: 'B', weight: 50, score: 50 }),
    ];
    expect(overallScore(cats)).toBe(75);
  });
});

describe('buildRecommendations', () => {
  it('returns empty when all passed', () => {
    expect(buildRecommendations([makeCat()])).toHaveLength(0);
  });

  it('returns recommendations for failed items', () => {
    const cat = makeCat({
      items: [
        makeItem({ id: 'T1', passed: false, description: 'need fix', hint: 'run test', fixCommand: 'npm test' }),
      ],
    });
    const recs = buildRecommendations([cat]);
    expect(recs).toHaveLength(1);
    expect(recs[0].text).toContain('[Test]');
    expect(recs[0].text).toContain('need fix');
    expect(recs[0].text).toContain('run test');
    expect(recs[0].fixCommand).toBe('npm test');
  });

  it('limits to 20 recommendations', () => {
    const items = Array.from({ length: 25 }, (_, i) => makeItem({ id: `T${i}`, passed: false }));
    const recs = buildRecommendations([makeCat({ items })]);
    expect(recs).toHaveLength(20);
  });

  it('includes current value in recommendation text', () => {
    const cat = makeCat({
      items: [makeItem({ passed: false, value: '42%' })],
    });
    const recs = buildRecommendations([cat]);
    expect(recs[0].text).toContain('42%');
  });
});

describe('buildAlerts', () => {
  it('returns empty when all passed', () => {
    expect(buildAlerts([makeCat()])).toHaveLength(0);
  });

  it('returns alerts for failed items with weight >= 3', () => {
    const cat = makeCat({
      items: [
        makeItem({ id: 'A', passed: false, weight: 3, description: 'critical fail' }),
        makeItem({ id: 'B', passed: false, weight: 1, description: 'minor fail' }),
      ],
    });
    const alerts = buildAlerts([cat]);
    expect(alerts).toHaveLength(1);
    expect(alerts[0].item).toBe('A');
    expect(alerts[0].severity).toBe('error');
  });

  it('returns multiple alerts from multiple categories', () => {
    const cats = [
      makeCat({ name: 'Segurança', items: [makeItem({ id: 'S1', passed: false, weight: 5 })] }),
      makeCat({ name: 'Qualidade', items: [makeItem({ id: 'Q1', passed: false, weight: 4 })] }),
    ];
    expect(buildAlerts(cats)).toHaveLength(2);
  });
});

describe('buildAIAnalysisPrompt', () => {
  it('returns prompt with result summary', () => {
    const result = baseResult({ overallScore: 85, maturityLevel: 'A' });
    const prompt = buildAIAnalysisPrompt(result);
    expect(prompt).toContain('Score: 85/100');
    expect(prompt).toContain('A');
    expect(prompt).toContain('Portuguese');
  });

  it('includes recommendations when present', () => {
    const result = baseResult({
      recommendations: [{ text: 'improve coverage' }, { text: 'fix security' }],
    });
    const prompt = buildAIAnalysisPrompt(result);
    expect(prompt).toContain('improve coverage');
    expect(prompt).toContain('fix security');
  });

  it('includes benchmarks when provided', () => {
    const result = baseResult();
    const benchmarks = { buildTimeMs: 5000, testTimeMs: 3000, lintTimeMs: 2000, totalFiles: 42 };
    const prompt = buildAIAnalysisPrompt(result, benchmarks);
    expect(prompt).toContain('Benchmarks');
    expect(prompt).toContain('5.0s');
    expect(prompt).toContain('3.0s');
    expect(prompt).toContain('42');
  });

  it('congratulates on high score', () => {
    const result = baseResult({ overallScore: 95, maturityLevel: 'A' });
    const prompt = buildAIAnalysisPrompt(result);
    expect(prompt).toContain('congratulate');
  });
});

describe('scoreDiffExport', () => {
  it('produces diff JSON between two results', () => {
    const r1 = baseResult({ timestamp: 'old', overallScore: 70, categories: [makeCat({ name: 'A', score: 70 })] });
    const r2 = baseResult({ timestamp: 'new', overallScore: 85, categories: [makeCat({ name: 'A', score: 85 })] });
    const diff = JSON.parse(scoreDiffExport(r1, r2));
    expect(diff.from.score).toBe(70);
    expect(diff.to.score).toBe(85);
    expect(diff.categories.A.diff).toBe(15);
  });

  it('handles categories only in first result', () => {
    const r1 = baseResult({ categories: [makeCat({ name: 'A', score: 80 })] });
    const r2 = baseResult({ categories: [makeCat({ name: 'B', score: 80 })] });
    const diff = JSON.parse(scoreDiffExport(r1, r2));
    expect(diff.categories.A).toBeUndefined();
  });

  it('handles empty categories', () => {
    const r1 = baseResult({ categories: [] });
    const r2 = baseResult({ categories: [] });
    const diff = JSON.parse(scoreDiffExport(r1, r2));
    expect(diff.categories).toEqual({});
  });
});

describe('forecastScore', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns low confidence when no snapshots', () => {
    mockReadDir.mockReturnValue([]);
    const result = forecastScore(30);
    expect(result.confidence).toBe('low');
    expect(result.forecast).toBe(0);
    expect(result.trend).toBe('stable');
  });

  it('returns low confidence when fewer than 3 snapshots', () => {
    mockReadDir.mockReturnValue(['s1.json', 's2.json']);
    const result = forecastScore(30);
    expect(result.confidence).toBe('low');
    expect(result.forecast).toBe(0);
    expect(result.history).toEqual([]);
  });

  it('returns a forecast with 5 data points', () => {
    mockReadDir.mockReturnValue(['s1.json', 's2.json', 's3.json', 's4.json', 's5.json']);
    mockRead
      .mockReturnValueOnce(JSON.stringify({ score: 70 }))
      .mockReturnValueOnce(JSON.stringify({ score: 71 }))
      .mockReturnValueOnce(JSON.stringify({ score: 70 }))
      .mockReturnValueOnce(JSON.stringify({ score: 71 }))
      .mockReturnValueOnce(JSON.stringify({ score: 70 }));
    const result = forecastScore(30);
    expect(['low', 'medium', 'high']).toContain(result.confidence);
    expect(['up', 'stable', 'down']).toContain(result.trend);
    expect(result.history.length).toBe(5);
  });

  it('handles readDir exceptions', () => {
    mockReadDir.mockImplementation(() => { throw new Error('ENOENT'); });
    const result = forecastScore(30);
    expect(result.confidence).toBe('low');
    expect(result.forecast).toBe(0);
  });
});
