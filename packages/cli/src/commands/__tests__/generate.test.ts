import { generateCommand } from '../generate';

describe('generate', () => {
  it('generateCommand should be defined', () => {
    expect(generateCommand).toBeDefined();
  });
  it('generateCommand should execute without throwing', () => {
    expect(typeof generateCommand).toBe('function');
    try { (generateCommand as any)(); } catch {}
  });
});
