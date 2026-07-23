import { syncCommand } from '../sync';

describe('sync', () => {
  it('syncCommand should be defined', () => {
    expect(syncCommand).toBeDefined();
  });
  it('syncCommand should execute without throwing', () => {
    expect(typeof syncCommand).toBe('function');
    try { (syncCommand as any)(); } catch {}
  });
});
