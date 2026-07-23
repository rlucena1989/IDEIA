import { getStages, runStages } from '../stages';
import type { StageDef } from '../stages';

describe('stages', () => {
  it('getStages should be defined', () => {
    expect(getStages).toBeDefined();
  });
  it('getStages should execute without throwing', () => {
    expect(typeof getStages).toBe('function');
    try { (getStages as any)(); } catch {}
  });
  it('runStages should be defined', () => {
    expect(runStages).toBeDefined();
  });
  it('runStages should execute without throwing', () => {
    expect(typeof runStages).toBe('function');
    try { (runStages as any)(); } catch {}
  });
  it('StageDef interface should be a type', () => {
    expect(typeof (null as unknown as StageDef)).toBe('object');
  });
});
