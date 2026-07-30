import { detectAnomalies, detectTrend } from '../anomaly';

describe('detectAnomalies', () => {
  it('returns no anomalies for uniform values', () => {
    const result = detectAnomalies([10, 10, 10, 10, 10]);
    expect(result.every(r => !r.isAnomaly)).toBe(true);
  });

  it('detects outlier with high z-score', () => {
    const result = detectAnomalies([10, 12, 11, 100, 9]);
    const anomaly = result.find(r => r.isAnomaly);
    expect(anomaly).toBeDefined();
    expect(anomaly!.severity).toBe('high');
  });

  it('handles empty array', () => {
    const result = detectAnomalies([]);
    expect(result).toEqual([]);
  });

  it('uses custom threshold', () => {
    const result = detectAnomalies([10, 12, 11, 15, 9], 5);
    expect(result.every(r => !r.isAnomaly)).toBe(true);
  });
});

describe('detectTrend', () => {
  it('returns stable for less than 3 values', () => {
    expect(detectTrend([1, 2])).toBe('stable');
  });

  it('returns up when second half is higher', () => {
    expect(detectTrend([1, 2, 10, 20])).toBe('up');
  });

  it('returns down when second half is lower', () => {
    expect(detectTrend([20, 18, 10, 5])).toBe('down');
  });

  it('returns stable for flat values', () => {
    expect(detectTrend([10, 10, 10, 10])).toBe('stable');
  });
});
