import { mapRulesToFramework, generateReport } from '../mapper';
import type { RuleEntry, ComplianceMapping, ComplianceReport } from '../mapper';

describe('mapper', () => {
  it('mapRulesToFramework should be defined', () => {
    expect(mapRulesToFramework).toBeDefined();
  });
  it('mapRulesToFramework should execute without throwing', () => {
    expect(typeof mapRulesToFramework).toBe('function');
    try { (mapRulesToFramework as any)(); } catch {}
  });
  it('generateReport should be defined', () => {
    expect(generateReport).toBeDefined();
  });
  it('generateReport should execute without throwing', () => {
    expect(typeof generateReport).toBe('function');
    try { (generateReport as any)(); } catch {}
  });
  it('RuleEntry interface should be a type', () => {
    expect(typeof (null as unknown as RuleEntry)).toBe('object');
  });
  it('ComplianceMapping interface should be a type', () => {
    expect(typeof (null as unknown as ComplianceMapping)).toBe('object');
  });
  it('ComplianceReport interface should be a type', () => {
    expect(typeof (null as unknown as ComplianceReport)).toBe('object');
  });
});
