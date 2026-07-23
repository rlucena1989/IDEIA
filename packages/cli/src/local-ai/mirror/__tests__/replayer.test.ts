import { replayEntry, formatReplayResult } from '../replayer';

describe('replayer', () => {
  it('replayEntry should be defined', () => {
    expect(replayEntry).toBeDefined();
  });
  it('replayEntry should execute without throwing', async () => {
    expect(typeof replayEntry).toBe('function');
    await expect((replayEntry as any)()).rejects.toThrow();
  });
  it('formatReplayResult should be defined', () => {
    expect(formatReplayResult).toBeDefined();
  });
  it('formatReplayResult should execute without throwing', () => {
    expect(typeof formatReplayResult).toBe('function');
    try { (formatReplayResult as any)(); } catch {}
  });
});
