import { median, quartiles, correlation, linearRegression, summary } from './stats-engine';

describe('stats-engine', () => {
  it('should compute median with odd length', () => {
    expect(median([1, 2, 3])).toBe(2);
  });

  it('should compute median with even length', () => {
    expect(median([1, 2, 3, 4])).toBe(2.5);
  });

  it('should return 0 for empty median', () => {
    expect(median([])).toBe(0);
  });

  it('should compute quartiles', () => {
    const q = quartiles([1, 2, 3, 4, 5, 6, 7, 8]);
    expect(q.q1).toBe(2.5);
    expect(q.q2).toBe(4.5);
    expect(q.q3).toBe(6.5);
  });

  it('should compute correlation', () => {
    expect(correlation([1, 2, 3], [1, 2, 3])).toBeCloseTo(1, 4);
    expect(correlation([1, 2, 3], [3, 2, 1])).toBeCloseTo(-1, 4);
    expect(correlation([1], [2])).toBe(0);
    expect(correlation([1, 2], [3, 4])).toBeCloseTo(1, 4);
  });

  it('should compute linear regression', () => {
    const result = linearRegression([1, 2, 3, 4], [2, 4, 6, 8]);
    expect(result.slope).toBe(2);
    expect(result.intercept).toBe(0);
    expect(result.r2).toBe(1);
  });

  it('should return zeros for insufficient data', () => {
    const result = linearRegression([1], [2]);
    expect(result).toEqual({ slope: 0, intercept: 0, r2: 0 });
  });

  it('should compute summary', () => {
    const s = summary([1, 2, 3, 4, 5]);
    expect(s.min).toBe(1);
    expect(s.max).toBe(5);
    expect(s.mean).toBe(3);
    expect(s.count).toBe(5);
  });
});