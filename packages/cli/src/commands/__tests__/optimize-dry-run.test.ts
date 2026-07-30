import { handleOptimizeDryRun } from '../optimize-dry-run';

describe('optimize-dry-run handler', () => {
  it('handleOptimizeDryRun should be defined', () => {
    expect(handleOptimizeDryRun).toBeDefined();
    expect(typeof handleOptimizeDryRun).toBe('function');
  });
});
