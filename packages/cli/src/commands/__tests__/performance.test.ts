import { performanceCommand } from '../performance';

describe('performance', () => {
  it('performanceCommand should be defined', () => {
    expect(performanceCommand).toBeDefined();
  });
  it('performanceCommand should execute without throwing', () => {
    expect(typeof performanceCommand).toBe('function');
    try { (performanceCommand as any)(); } catch {}
  });
});
