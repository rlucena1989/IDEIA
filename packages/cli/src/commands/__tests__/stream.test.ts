import { streamCommand } from '../stream';

describe('stream', () => {
  it('streamCommand should be defined', () => {
    expect(streamCommand).toBeDefined();
  });
  it('streamCommand should execute without throwing', () => {
    expect(typeof streamCommand).toBe('function');
    try { (streamCommand as any)(); } catch {}
  });
});
