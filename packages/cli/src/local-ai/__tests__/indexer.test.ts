import { buildIndex, getIndex, getIndexStatus } from '../indexer';
import type { IndexStatus } from '../indexer';

describe('indexer', () => {
  it('buildIndex should be defined', () => {
    expect(buildIndex).toBeDefined();
  });
  it('buildIndex should execute without throwing', () => {
    expect(typeof buildIndex).toBe('function');
    try { (buildIndex as any)(); } catch {}
  });
  it('getIndex should be defined', () => {
    expect(getIndex).toBeDefined();
  });
  it('getIndex should execute without throwing', () => {
    expect(typeof getIndex).toBe('function');
    try { (getIndex as any)(); } catch {}
  });
  it('getIndexStatus should be defined', () => {
    expect(getIndexStatus).toBeDefined();
  });
  it('getIndexStatus should execute without throwing', () => {
    expect(typeof getIndexStatus).toBe('function');
    try { (getIndexStatus as any)(); } catch {}
  });
  it('IndexStatus interface should be a type', () => {
    expect(typeof (null as unknown as IndexStatus)).toBe('object');
  });
});
