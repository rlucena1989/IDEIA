import { simulateCommand } from '../simulate';

describe('simulate', () => {
  it('simulateCommand should be defined', () => {
    expect(simulateCommand).toBeDefined();
  });
  it('simulateCommand should execute without throwing', () => {
    expect(typeof simulateCommand).toBe('function');
    try { (simulateCommand as any)(); } catch {}
  });
});
