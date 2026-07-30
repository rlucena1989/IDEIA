import { handleOptimizeServe } from '../optimize-serve';

describe('optimize-serve handler', () => {
  it('handleOptimizeServe should be defined', () => {
    expect(handleOptimizeServe).toBeDefined();
    expect(typeof handleOptimizeServe).toBe('function');
  });
});
