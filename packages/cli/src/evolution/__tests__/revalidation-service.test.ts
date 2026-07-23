import { describe, it, expect } from '@jest/globals';
import { revalidateEvolution } from '../revalidation-service';

describe('revalidation-service', () => {
  it('revalidateEvolution should be defined', () => {
    expect(revalidateEvolution).toBeDefined();
  });

  it('should return ok when score improved', () => {
    const result = revalidateEvolution(70, 85);
    expect(result.ok).toBe(true);
    expect(result.delta).toBe(15);
    expect(result.notes).toContain('State improved or remained stable.');
  });

  it('should return not ok when score regressed', () => {
    const result = revalidateEvolution(85, 70);
    expect(result.ok).toBe(false);
    expect(result.delta).toBe(-15);
    expect(result.notes).toContain('State regressed after execution.');
  });

  it('should return ok when score unchanged', () => {
    const result = revalidateEvolution(80, 80);
    expect(result.ok).toBe(true);
    expect(result.delta).toBe(0);
  });
});
