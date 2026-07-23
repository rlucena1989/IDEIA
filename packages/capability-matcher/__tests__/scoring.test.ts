import { calculateConfidence, clamp, normalizeKeywords, normalizeStack, WEIGHTS } from '../src/scoring';

describe('scoring', () => {
  it('calculateConfidence returns weighted sum', () => {
    const result = calculateConfidence({ keywordMatch: 1, domainFit: 0.5, complexityFit: 0.5, stackFit: 0.5 });
    const expected = 1 * 0.35 + 0.5 * 0.25 + 0.5 * 0.20 + 0.5 * 0.20;
    expect(result).toBeCloseTo(expected);
  });

  it('clamp restricts value to [min, max]', () => {
    expect(clamp(5, 0, 1)).toBe(1);
    expect(clamp(-1, 0, 1)).toBe(0);
    expect(clamp(0.5, 0, 1)).toBe(0.5);
  });

  it('normalizeKeywords returns 0 for total 0', () => {
    expect(normalizeKeywords(5, 0)).toBe(0);
  });

  it('normalizeKeywords returns ratio', () => {
    expect(normalizeKeywords(3, 10)).toBeCloseTo(0.3);
  });

  it('normalizeStack returns 0.5 for targetSize 0', () => {
    expect(normalizeStack(3, 0)).toBe(0.5);
  });

  it('normalizeStack returns clamped ratio', () => {
    expect(normalizeStack(5, 10)).toBeCloseTo(0.5);
  });

  it('WEIGHTS are non-negative and sum to 1', () => {
    const sum = Object.values(WEIGHTS).reduce((a, b) => a + b, 0);
    expect(sum).toBeCloseTo(1);
  });
});
