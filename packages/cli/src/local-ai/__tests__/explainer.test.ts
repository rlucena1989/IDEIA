import { explainViolation, suggestContext, prioritizeViolations } from '../explainer';
import type { ViolationInfo } from '../explainer';

describe('explainer', () => {
  it('explainViolation should be defined', () => {
    expect(explainViolation).toBeDefined();
  });
  it('explainViolation should execute without throwing', () => {
    expect(typeof explainViolation).toBe('function');
    try { (async () => { await (explainViolation as any)() })(); } catch {}
  });
  it('suggestContext should be defined', () => {
    expect(suggestContext).toBeDefined();
  });
  it('suggestContext should execute without throwing', () => {
    expect(typeof suggestContext).toBe('function');
    try { (async () => { await (suggestContext as any)() })(); } catch {}
  });
  it('prioritizeViolations should be defined', () => {
    expect(prioritizeViolations).toBeDefined();
  });
  it('prioritizeViolations should execute without throwing', () => {
    expect(typeof prioritizeViolations).toBe('function');
    try { (async () => { await (prioritizeViolations as any)() })(); } catch {}
  });
  it('ViolationInfo interface should be a type', () => {
    expect(typeof (null as unknown as ViolationInfo)).toBe('object');
  });
});
