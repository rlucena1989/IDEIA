import { describe, it, expect } from '@jest/globals';
import { executePlan } from '../executor';

describe('executor', () => {
  it('executePlan should be defined', () => {
    expect(executePlan).toBeDefined();
  });
  it('executePlan should be a function', () => {
    expect(typeof executePlan).toBe('function');
  });
});
