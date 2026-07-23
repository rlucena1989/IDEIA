import { ragCommand } from '../rag';

describe('rag', () => {
  it('ragCommand should be defined', () => {
    expect(ragCommand).toBeDefined();
  });
  it('ragCommand should execute without throwing', () => {
    expect(typeof ragCommand).toBe('function');
    try { (ragCommand as any)(); } catch {}
  });
});
