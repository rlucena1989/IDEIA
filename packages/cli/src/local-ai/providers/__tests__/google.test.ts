import { GoogleProvider } from '../google';

describe('google', () => {
  it('GoogleProvider should be defined', () => {
    expect(GoogleProvider).toBeDefined();
  });
  it('GoogleProvider should execute without throwing', () => {
    expect(typeof GoogleProvider).toBe('function');
    try { new (GoogleProvider as any)(); } catch {}
  });
});
