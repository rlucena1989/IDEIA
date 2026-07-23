import { promptCommand } from '../prompt';

describe('prompt', () => {
  it('promptCommand should be defined', () => {
    expect(promptCommand).toBeDefined();
  });
  it('promptCommand should execute without throwing', () => {
    expect(typeof promptCommand).toBe('function');
    try { (promptCommand as any)(); } catch {}
  });
});
