import { describe, it, expect } from '@jest/globals';
import { classifyFailure, getRetryDecision } from '../retry-policy';

describe('retry-policy', () => {
  it('classifyFailure should be defined', () => {
    expect(classifyFailure).toBeDefined();
  });
  it('classifyFailure should be a function', () => {
    expect(typeof classifyFailure).toBe('function');
  });
  it('getRetryDecision should be defined', () => {
    expect(getRetryDecision).toBeDefined();
  });
  it('getRetryDecision should be a function', () => {
    expect(typeof getRetryDecision).toBe('function');
  });
});
