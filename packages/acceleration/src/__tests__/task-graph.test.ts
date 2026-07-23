import { describe, it, expect } from '@jest/globals';
import { topologicalSort, criticalPath, estimateTotalDuration } from '../task-graph';

describe('task-graph', () => {
  it('topologicalSort should be defined', () => {
    expect(topologicalSort).toBeDefined();
  });
  it('topologicalSort should be a function', () => {
    expect(typeof topologicalSort).toBe('function');
  });
  it('criticalPath should be defined', () => {
    expect(criticalPath).toBeDefined();
  });
  it('criticalPath should be a function', () => {
    expect(typeof criticalPath).toBe('function');
  });
  it('estimateTotalDuration should be defined', () => {
    expect(estimateTotalDuration).toBeDefined();
  });
  it('estimateTotalDuration should be a function', () => {
    expect(typeof estimateTotalDuration).toBe('function');
  });
});
