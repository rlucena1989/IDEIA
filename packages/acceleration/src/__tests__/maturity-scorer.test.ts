import { describe, it, expect } from '@jest/globals';
import { scoreMaturity } from '../maturity-scorer';

describe('maturity-scorer', () => {
  it('scoreMaturity should be defined', () => {
    expect(scoreMaturity).toBeDefined();
  });
  it('scoreMaturity should be a function', () => {
    expect(typeof scoreMaturity).toBe('function');
  });
});
