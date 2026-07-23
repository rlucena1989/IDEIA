import { describe, it, expect } from '@jest/globals';
import { assessRisk } from '../risk-model';

describe('risk-model', () => {
  it('assessRisk should be defined', () => {
    expect(assessRisk).toBeDefined();
  });

  it('should return low risk for low scores', () => {
    const risk = assessRisk('component-x', 1, 2);
    expect(risk.likelihood).toBe('low');
    expect(risk.impact).toBe('low');
    expect(risk.score).toBe(2);
  });

  it('should return critical risk for high scores', () => {
    const risk = assessRisk('component-y', 9, 9);
    expect(risk.likelihood).toBe('critical');
    expect(risk.impact).toBe('critical');
    expect(risk.score).toBe(81);
  });

  it('should compute score as product', () => {
    const risk = assessRisk('component-z', 4, 5);
    expect(risk.score).toBe(20);
    expect(risk.subject).toBe('component-z');
  });
});
