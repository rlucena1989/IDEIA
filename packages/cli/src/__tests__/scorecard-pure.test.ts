import { level, calcScore, overallScore, shieldColor, generateBadge, buildRecommendations, buildAlerts, buildTrends } from '../commands/scorecard-utils';
import { ScorecardItem, ScorecardCategory, ScorecardResult } from '../commands/scorecard';

describe('scorecard pure functions', () => {
  describe('level()', () => {
    it('A para score >= 90', () => { expect(level(90)).toBe('A'); expect(level(100)).toBe('A'); });
    it('B para score >= 70 e < 90', () => { expect(level(70)).toBe('B'); expect(level(89)).toBe('B'); expect(level(80)).toBe('B'); });
    it('C para score >= 50 e < 70', () => { expect(level(50)).toBe('C'); expect(level(69)).toBe('C'); });
    it('D para score < 50', () => { expect(level(0)).toBe('D'); expect(level(49)).toBe('D'); });
  });

  describe('calcScore()', () => {
    const items: ScorecardItem[] = [
      { id: 'T1', description: 'test1', weight: 3, passed: true },
      { id: 'T2', description: 'test2', weight: 2, passed: false },
      { id: 'T3', description: 'test3', weight: 5, passed: true },
    ];
    it('calcula percentual de itens aprovados por peso', () => { expect(calcScore(items)).toBe(80); });
    it('retorna 0 quando lista vazia', () => { expect(calcScore([])).toBe(0); });
    it('retorna 100 quando todos passam', () => {
      const all: ScorecardItem[] = [{ id: 'X', description: 'x', weight: 1, passed: true }];
      expect(calcScore(all)).toBe(100);
    });
  });

  describe('overallScore()', () => {
    it('calcula media ponderada de categorias', () => {
      const cats: ScorecardCategory[] = [
        { name: 'Sec', weight: 20, score: 50, maxScore: 100, items: [] },
        { name: 'Qual', weight: 80, score: 100, maxScore: 100, items: [] },
      ];
      expect(overallScore(cats)).toBe(90);
    });
    it('retorna 0 para lista vazia', () => { expect(overallScore([])).toBe(0); });
    it('lida com categoria de peso 0', () => {
      const cats: ScorecardCategory[] = [
        { name: 'Zero', weight: 0, score: 0, maxScore: 100, items: [] },
        { name: 'Full', weight: 100, score: 100, maxScore: 100, items: [] },
      ];
      expect(overallScore(cats)).toBe(100);
    });
    it('lida com uma unica categoria', () => {
      const cats: ScorecardCategory[] = [
        { name: 'Only', weight: 100, score: 75, maxScore: 100, items: [] },
      ];
      expect(overallScore(cats)).toBe(75);
    });
  });

  describe('shieldColor()', () => {
    it('brightgreen para >= 90', () => { expect(shieldColor(90)).toBe('brightgreen'); expect(shieldColor(95)).toBe('brightgreen'); });
    it('yellow para >= 70', () => { expect(shieldColor(70)).toBe('yellow'); expect(shieldColor(89)).toBe('yellow'); });
    it('orange para >= 50', () => { expect(shieldColor(50)).toBe('orange'); expect(shieldColor(69)).toBe('orange'); });
    it('red para < 50', () => { expect(shieldColor(0)).toBe('red'); expect(shieldColor(49)).toBe('red'); });
  });

  describe('generateBadge()', () => {
    it('gera SVG valido com score', () => { const svg = generateBadge(85); expect(svg).toContain('<svg'); expect(svg).toContain('85/100'); expect(svg).toContain('maturidade'); });
    it('SVG para score baixo usa cor vermelha', () => { const svg = generateBadge(30); expect(svg).toContain('30/100'); });
    it('SVG para score alto usa cor verde', () => { const svg = generateBadge(95); expect(svg).toContain('95/100'); });
  });

  describe('buildRecommendations()', () => {
    it('retorna recomendacoes para itens nao aprovados', () => {
      const cats: ScorecardCategory[] = [{ name: 'Sec', weight: 10, score: 0, maxScore: 100, items: [{ id: 'S1', description: 'Falta policy', weight: 2, passed: false }] }];
      const recs = buildRecommendations(cats);
      expect(recs).toHaveLength(1);
      expect(recs[0].text).toContain('Falta policy');
    });
    it('retorna vazio quando todos passam', () => {
      const cats: ScorecardCategory[] = [{ name: 'Sec', weight: 10, score: 100, maxScore: 100, items: [{ id: 'S1', description: 'OK', weight: 2, passed: true }] }];
      expect(buildRecommendations(cats)).toEqual([]);
    });
    it('limita a 20 recomendacoes', () => {
      const items = Array.from({ length: 25 }, (_, i) => ({ id: `I${i}`, description: `Item ${i}`, weight: 1, passed: false }));
      const cats: ScorecardCategory[] = [{ name: 'Test', weight: 10, score: 0, maxScore: 100, items }];
      expect(buildRecommendations(cats).length).toBe(20);
    });
  });

  describe('buildAlerts()', () => {
    it('alerta apenas para itens com weight >= 3 e nao aprovados', () => {
      const cats: ScorecardCategory[] = [{ name: 'Sec', weight: 10, score: 0, maxScore: 100, items: [
        { id: 'S1', description: 'Critical', weight: 3, passed: false },
        { id: 'S2', description: 'Minor', weight: 1, passed: false },
      ] }];
      const alerts = buildAlerts(cats);
      expect(alerts).toHaveLength(1);
      expect(alerts[0].item).toBe('S1');
    });
    it('retorna vazio quando todos passam', () => {
      const cats: ScorecardCategory[] = [{ name: 'Sec', weight: 10, score: 100, maxScore: 100, items: [{ id: 'S1', description: 'OK', weight: 3, passed: true }] }];
      expect(buildAlerts(cats)).toEqual([]);
    });
  });

  describe('buildTrends()', () => {
    const makeResult = (score: number, ts: string): ScorecardResult => ({
      timestamp: ts, overallScore: score, maturityLevel: level(score),
      categories: [], recommendations: [], evolution: { version: '1', categories: 0, items: 0 },
      trends: [], alerts: [], correlationAlerts: [], forecast: { forecast: 0, confidence: 'low', trend: 'stable', history: [] },
      git: { branch: 'main', commit: 'abc', message: 'ok' }, meta: { durationMs: 100, scorecardVersion: '1' },
    });
    it('mapeia historico para trends', () => {
      const history = [makeResult(80, '2024-01-01'), makeResult(90, '2024-01-02')];
      const trends = buildTrends(history);
      expect(trends).toHaveLength(2);
      expect(trends[0].overallScore).toBe(80);
      expect(trends[1].overallScore).toBe(90);
    });
    it('limita a 20 entradas', () => {
      const history = Array.from({ length: 30 }, (_, i) => makeResult(i, `2024-01-${String(i + 1).padStart(2, '0')}`));
      expect(buildTrends(history)).toHaveLength(20);
    });
    it('retorna vazio quando historico vazio', () => { expect(buildTrends([])).toEqual([]); });
  });
});