import { describe, it, expect } from '@jest/globals';
import { calcScore, level, shieldColor, generateBadge, overallScore } from '../commands/scorecard-utils';

describe('calcScore', () => {
  it('deve retornar 100 quando todos passam', () => {
    const items = [
      { id: 'T1', description: 'test 1', passed: true, weight: 2 },
      { id: 'T2', description: 'test 2', passed: true, weight: 1 }
    ];
    expect(calcScore(items)).toBe(100);
  });

  it('deve retornar 0 quando todos falham', () => {
    const items = [
      { id: 'T1', description: 'test 1', passed: false, weight: 2 },
      { id: 'T2', description: 'test 2', passed: false, weight: 1 }
    ];
    expect(calcScore(items)).toBe(0);
  });

  it('deve retornar 50 quando metade passa', () => {
    const items = [
      { id: 'T1', description: 'test 1', passed: true, weight: 2 },
      { id: 'T2', description: 'test 2', passed: false, weight: 2 }
    ];
    expect(calcScore(items)).toBe(50);
  });

  it('deve retornar 0 para lista vazia', () => {
    expect(calcScore([])).toBe(0);
  });

  it('deve ponderar corretamente com pesos diferentes', () => {
    const items = [
      { id: 'T1', description: 'test 1', passed: true, weight: 3 },
      { id: 'T2', description: 'test 2', passed: false, weight: 1 }
    ];
    expect(calcScore(items)).toBe(75);
  });
});

describe('level', () => {
  it('deve retornar A para score >= 90', () => {
    expect(level(100)).toBe('A');
    expect(level(95)).toBe('A');
    expect(level(90)).toBe('A');
  });

  it('deve retornar B para 70 <= score < 90', () => {
    expect(level(89)).toBe('B');
    expect(level(70)).toBe('B');
  });

  it('deve retornar C para 50 <= score < 70', () => {
    expect(level(69)).toBe('C');
    expect(level(50)).toBe('C');
  });

  it('deve retornar D para score < 50', () => {
    expect(level(49)).toBe('D');
    expect(level(0)).toBe('D');
  });
});

describe('shieldColor', () => {
  it('deve retornar brightgreen para score >= 90', () => {
    expect(shieldColor(100)).toBe('brightgreen');
    expect(shieldColor(90)).toBe('brightgreen');
  });

  it('deve retornar yellow para 70 <= score < 90', () => {
    expect(shieldColor(89)).toBe('yellow');
    expect(shieldColor(70)).toBe('yellow');
  });

  it('deve retornar orange para 50 <= score < 70', () => {
    expect(shieldColor(69)).toBe('orange');
    expect(shieldColor(50)).toBe('orange');
  });

  it('deve retornar red para score < 50', () => {
    expect(shieldColor(49)).toBe('red');
    expect(shieldColor(0)).toBe('red');
  });
});

describe('generateBadge', () => {
  it('deve gerar SVG com score e label', () => {
    const svg = generateBadge(97);
    expect(svg).toContain('<svg');
    expect(svg).toContain('97/100');
    expect(svg).toContain('maturidade');
  });

  it('deve usar cor brightgreen para score alto', () => {
    const svg = generateBadge(95);
    expect(svg).toContain('#4c1');
  });

  it('deve usar cor red para score baixo', () => {
    const svg = generateBadge(30);
    expect(svg).toContain('#e05d44');
  });
});

describe('overallScore', () => {
  it('deve calcular media ponderada', () => {
    const categories = [
      { name: 'Cat1', weight: 10, score: 100, maxScore: 100, items: [] },
      { name: 'Cat2', weight: 10, score: 0, maxScore: 100, items: [] }
    ];
    expect(overallScore(categories)).toBe(50);
  });

  it('deve retornar 0 para lista vazia', () => {
    expect(overallScore([])).toBe(0);
  });

  it('deve ponderar corretamente com pesos desiguais', () => {
    const categories = [
      { name: 'Cat1', weight: 15, score: 100, maxScore: 100, items: [] },
      { name: 'Cat2', weight: 5, score: 0, maxScore: 100, items: [] }
    ];
    expect(overallScore(categories)).toBe(75);
  });

  it('deve funcionar com multiplas categorias', () => {
    const categories = [
      { name: 'A', weight: 10, score: 100, maxScore: 100, items: [] },
      { name: 'B', weight: 20, score: 80, maxScore: 100, items: [] },
      { name: 'C', weight: 30, score: 60, maxScore: 100, items: [] }
    ];
    const expected = (10 * 100 + 20 * 80 + 30 * 60) / 60;
    expect(overallScore(categories)).toBeCloseTo(expected, 5);
  });
});
