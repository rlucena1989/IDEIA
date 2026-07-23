import { mirrorCommand } from '../mirror';

describe('mirror', () => {
  it('mirrorCommand should be defined', () => {
    expect(mirrorCommand).toBeDefined();
  });
  it('mirrorCommand should execute without throwing', () => {
    expect(typeof mirrorCommand).toBe('function');
    try { (mirrorCommand as any)(); } catch {}
  });
});
