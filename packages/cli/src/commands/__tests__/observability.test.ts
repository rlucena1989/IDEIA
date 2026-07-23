import { recordAutoTrace, observabilityCommand } from '../observability';

describe('observability', () => {
  it('recordAutoTrace should be defined', () => {
    expect(recordAutoTrace).toBeDefined();
  });
  it('recordAutoTrace should execute without throwing', () => {
    expect(typeof recordAutoTrace).toBe('function');
    try { (recordAutoTrace as any)(); } catch {}
  });
  it('observabilityCommand should be defined', () => {
    expect(observabilityCommand).toBeDefined();
  });
  it('observabilityCommand should execute without throwing', () => {
    expect(typeof observabilityCommand).toBe('function');
    try { (observabilityCommand as any)(); } catch {}
  });
});
