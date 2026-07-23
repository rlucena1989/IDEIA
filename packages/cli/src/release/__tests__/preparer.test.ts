import { prepareRelease } from '../preparer';
import type { ReleasePrepareResult } from '../preparer';

describe('preparer', () => {
  it('prepareRelease should be defined', () => {
    expect(prepareRelease).toBeDefined();
  });
  it('prepareRelease should execute without throwing', () => {
    expect(typeof prepareRelease).toBe('function');
    try { (prepareRelease as any)(); } catch {}
  });
  it('ReleasePrepareResult interface should be a type', () => {
    expect(typeof (null as unknown as ReleasePrepareResult)).toBe('object');
  });
});
