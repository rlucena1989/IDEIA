import { describe, it, expect } from '@jest/globals';
import { analyzeGaps } from '../gap-analyzer';
import { createTargetState } from '../target-state';

describe('gap-analyzer', () => {
  it('analyzeGaps should be defined', () => {
    expect(analyzeGaps).toBeDefined();
  });

  it('should return empty for full capability match', () => {
    const target = createTargetState({
      name: 'Test', description: '',
      capabilities: [{ id: 'a', name: 'A', description: '', required: true }],
    });
    expect(analyzeGaps(target, ['a'])).toEqual([]);
  });

  it('should return gaps for missing required capabilities', () => {
    const target = createTargetState({
      name: 'Test', description: '',
      capabilities: [
        { id: 'a', name: 'A', description: '', required: true },
        { id: 'b', name: 'B', description: '', required: true },
      ],
    });
    const gaps = analyzeGaps(target, ['a']);
    expect(gaps.length).toBe(1);
    expect(gaps[0].gapId).toBe('gap-b');
  });

  it('should skip non-required capabilities', () => {
    const target = createTargetState({
      name: 'Test', description: '',
      capabilities: [
        { id: 'a', name: 'A', description: '', required: true },
        { id: 'b', name: 'B', description: '', required: false },
      ],
    });
    const gaps = analyzeGaps(target, []);
    expect(gaps.length).toBe(1);
  });
});
