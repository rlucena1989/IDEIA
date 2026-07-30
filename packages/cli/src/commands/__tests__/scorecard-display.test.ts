import type { ScorecardResult } from '../scorecard-types';

jest.mock('../scorecard-utils', () => ({
  root: jest.fn(() => '/test'),
  read: jest.fn(),
  git: jest.fn(),
  gitExists: jest.fn(),
}));

import { print } from '../scorecard-display';

const baseResult = (overrides: Partial<ScorecardResult> = {}): ScorecardResult => ({
  timestamp: '2026-07-26T12:00:00.000Z',
  overallScore: 75,
  maturityLevel: 'B',
  categories: [
    {
      name: 'Segurança', weight: 50, score: 80, maxScore: 100,
      items: [{ id: 'S1', description: 'SSL config', passed: true, weight: 10 }],
    },
  ],
  recommendations: [{ text: 'Improve coverage' }],
  evolution: { version: '18.0', categories: 1, items: 5 },
  trends: [{ timestamp: '2026-07-25T00:00:00.000Z', overallScore: 70, categories: [{ name: 'Segurança', score: 80 }] }],
  alerts: [],
  correlationAlerts: [],
  forecast: { forecast: 78, confidence: 'medium', trend: 'up', history: [70, 72, 75] },
  git: { branch: 'main', commit: 'abc1234', message: 'test' },
  meta: { durationMs: 100, scorecardVersion: '18.0' },
  ...overrides,
});

describe('print', () => {
  let consoleSpy: jest.SpyInstance;

  beforeEach(() => {
    consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleSpy.mockRestore();
  });

  it('prints scorecard header with score', () => {
    print(baseResult());
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('SCORECARD'));
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('75/100'));
  });

  it('prints green indicator for score >= 90', () => {
    print(baseResult({ overallScore: 95, maturityLevel: 'A' }));
    const calls = consoleSpy.mock.calls.map(c => c[0]).join(' ');
    expect(calls).toContain('Nivel A');
  });

  it('prints category bars and items', () => {
    print(baseResult());
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Segurança'));
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('SSL config'));
  });

  it('shows forecast when enough history', () => {
    print(baseResult());
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Previsão'));
  });

  it('shows alerts when present', () => {
    print(baseResult({
      alerts: [{ category: 'Security', item: 'S1', severity: 'error', message: 'Critical alert' }],
    }));
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('ALERTAS'));
  });

  it('shows recommendations', () => {
    print(baseResult());
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('RECOMENDACOES'));
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Improve coverage'));
  });

  it('shows correlation alerts', () => {
    print(baseResult({
      correlationAlerts: [{ severity: 'critical', message: 'Correlation warning', categories: ['A', 'B'] }],
    }));
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('CORRELAÇÕES'));
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Correlation warning'));
  });

  it('shows trend when 2+ entries', () => {
    print(baseResult({
      trends: [
        { timestamp: 'old', overallScore: 70, categories: [] },
        { timestamp: 'older', overallScore: 65, categories: [] },
      ],
    }));
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Tendencia'));
  });

  it('skips forecast when history has < 3 entries', () => {
    print(baseResult({
      forecast: { forecast: 0, confidence: 'low', trend: 'stable', history: [70] },
    }));
    const calls = consoleSpy.mock.calls.map(c => c[0]).join(' ');
    expect(calls).not.toContain('Previsão');
  });
});
