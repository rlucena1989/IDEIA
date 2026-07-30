import { handleOptimizeExplain } from '../optimize-explain';

describe('optimize-explain handler', () => {
  it('handleOptimizeExplain should be defined', () => {
    expect(handleOptimizeExplain).toBeDefined();
    expect(typeof handleOptimizeExplain).toBe('function');
  });
});
