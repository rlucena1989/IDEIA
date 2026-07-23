import { sum, mean, variance, stddev, min, max, clamp, lerp, roundTo, floorTo, ceilTo, significantDigits, sumKahan, varianceWelford, stddevWelford } from './numerical-engine';

describe('numerical-engine', () => {
  it('should compute sum', () => {
    expect(sum([1, 2, 3])).toBe(6);
    expect(sum([])).toBe(0);
  });

  it('should compute mean', () => {
    expect(mean([1, 2, 3])).toBe(2);
    expect(mean([])).toBe(0);
  });

  it('should compute variance', () => {
    expect(variance([1, 2, 3])).toBeCloseTo(0.6667, 2);
    expect(variance([1])).toBe(0);
    expect(variance([])).toBe(0);
  });

  it('should compute stddev', () => {
    expect(stddev([1, 2, 3])).toBeCloseTo(0.8165, 2);
    expect(stddev([])).toBe(0);
  });

  it('should compute min and max', () => {
    expect(min([3, 1, 2])).toBe(1);
    expect(max([3, 1, 2])).toBe(3);
    expect(min([])).toBe(0);
    expect(max([])).toBe(0);
  });

  it('should clamp values', () => {
    expect(clamp(5, 1, 10)).toBe(5);
    expect(clamp(-1, 1, 10)).toBe(1);
    expect(clamp(15, 1, 10)).toBe(10);
  });

  it('should lerp', () => {
    expect(lerp(0, 10, 0.5)).toBe(5);
    expect(lerp(0, 10, 0)).toBe(0);
    expect(lerp(0, 10, 1)).toBe(10);
  });

  it('should round to decimals', () => {
    expect(roundTo(1.23456, 2)).toBe(1.23);
    expect(floorTo(1.23456, 2)).toBe(1.23);
    expect(ceilTo(1.23456, 2)).toBe(1.24);
  });

  it('should compute significant digits', () => {
    expect(significantDigits(12345, 3)).toBe(12300);
    expect(significantDigits(0, 2)).toBe(0);
  });

  it('should compute sumKahan', () => {
    expect(sumKahan([1, 2, 3])).toBeCloseTo(6, 5);
  });

  it('should compute varianceWelford', () => {
    expect(varianceWelford([1, 2, 3])).toBeCloseTo(0.6667, 2);
    expect(varianceWelford([1])).toBe(0);
  });

  it('should compute stddevWelford', () => {
    expect(stddevWelford([1, 2, 3])).toBeCloseTo(0.8165, 2);
  });
});