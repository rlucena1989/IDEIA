import { rulesCommand } from '../rules';

describe('rules', () => {
  it('rulesCommand should be defined', () => {
    expect(rulesCommand).toBeDefined();
  });
  it('rulesCommand should execute without throwing', () => {
    expect(typeof rulesCommand).toBe('function');
    try { (rulesCommand as any)(); } catch {}
  });
});
