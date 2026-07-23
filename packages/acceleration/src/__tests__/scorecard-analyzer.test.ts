import { describe, it, expect } from '@jest/globals';
import { analyzeScorecard } from '../scorecard-analyzer';

describe('scorecard-analyzer', () => {
  it('analyzeScorecard should be defined', () => {
    expect(analyzeScorecard).toBeDefined();
  });
  it('analyzeScorecard should be a function', () => {
    expect(typeof analyzeScorecard).toBe('function');
  });
});
