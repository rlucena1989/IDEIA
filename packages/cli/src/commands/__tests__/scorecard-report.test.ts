import type { ScorecardResult } from '../scorecard-types';
import { generateHTML } from '../scorecard-report';

const baseResult = (overrides: Partial<ScorecardResult> = {}): ScorecardResult => ({
  timestamp: '2026-07-26T12:00:00.000Z',
  overallScore: 75,
  maturityLevel: 'B',
  categories: [
    {
      name: 'Segurança', weight: 50, score: 80, maxScore: 100,
      items: [
        { id: 'S1', description: 'SSL config', passed: true, weight: 10 },
        { id: 'S2', description: 'Firewall rules', passed: false, weight: 5, value: '3/5' },
      ],
    },
  ],
  recommendations: [],
  evolution: { version: '18.0', categories: 1, items: 2 },
  trends: [],
  alerts: [],
  correlationAlerts: [],
  forecast: { forecast: 78, confidence: 'medium', trend: 'up', history: [] },
  git: { branch: 'main', commit: 'abc1234', message: 'test' },
  meta: { durationMs: 150, scorecardVersion: '18.0' },
  ...overrides,
});

describe('generateHTML', () => {
  it('returns HTML string with DOCTYPE', () => {
    const html = generateHTML(baseResult());
    expect(html).toContain('<!DOCTYPE html>');
    expect(html).toContain('Scorecard Report');
  });

  it('includes overall score in title', () => {
    const html = generateHTML(baseResult({ overallScore: 85 }));
    expect(html).toContain('85/100');
  });

  it('includes category information', () => {
    const html = generateHTML(baseResult());
    expect(html).toContain('Segurança');
    expect(html).toContain('80/100');
  });

  it('shows PASS and FAIL for items', () => {
    const html = generateHTML(baseResult());
    expect(html).toContain('PASS');
    expect(html).toContain('FAIL');
  });

  it('shows item values when present', () => {
    const html = generateHTML(baseResult());
    expect(html).toContain('3/5');
  });

  it('includes git and meta info', () => {
    const html = generateHTML(baseResult());
    expect(html).toContain('main');
    expect(html).toContain('abc1234');
    expect(html).toContain('150ms');
  });

  it('shows alerts when present', () => {
    const result = baseResult({
      alerts: [{ category: 'Security', item: 'S1', severity: 'error', message: 'Critical issue' }],
    });
    const html = generateHTML(result);
    expect(html).toContain('Alertas');
    expect(html).toContain('Critical issue');
  });

  it('hides alerts section when no alerts', () => {
    const html = generateHTML(baseResult());
    expect(html).not.toContain('Alertas');
  });

  it('uses green color for high score', () => {
    const html = generateHTML(baseResult({ overallScore: 95 }));
    expect(html).toContain('#22c55e');
  });

  it('uses red color for low score', () => {
    const html = generateHTML(baseResult({ overallScore: 30 }));
    expect(html).toContain('#ef4444');
  });

  it('uses orange color for medium score', () => {
    const html = generateHTML(baseResult({ overallScore: 55 }));
    expect(html).toContain('#f97316');
  });

  it('handles empty categories gracefully', () => {
    const result = baseResult({ categories: [] });
    const html = generateHTML(result);
    expect(html).toContain('Scorecard Report');
  });

  it('skips zero-weight categories', () => {
    const result = baseResult({
      categories: [
        { name: 'Hidden', weight: 0, score: 0, maxScore: 100, items: [] },
        { name: 'Visible', weight: 50, score: 80, maxScore: 100, items: [] },
      ],
    });
    const html = generateHTML(result);
    expect(html).not.toContain('Hidden');
    expect(html).toContain('Visible');
  });
});
