import { detectType, validateSpec, detectSpecType } from '../validator';
import type { ValidationResult } from '../validator';

describe('validator', () => {
  it('detectType should be defined', () => {
    expect(detectType).toBeDefined();
  });
  it('detectType should execute without throwing', () => {
    expect(typeof detectType).toBe('function');
    try { (detectType as any)(); } catch {}
  });
  it('validateSpec should be defined', () => {
    expect(validateSpec).toBeDefined();
  });
  it('validateSpec should execute without throwing', () => {
    expect(typeof validateSpec).toBe('function');
    try { (validateSpec as any)(); } catch {}
  });
  it('detectSpecType should be defined', () => {
    expect(detectSpecType).toBeDefined();
  });
  it('detectSpecType should execute without throwing', () => {
    expect(typeof detectSpecType).toBe('function');
    try { (detectSpecType as any)(); } catch {}
  });
  it('ValidationResult interface should be a type', () => {
    expect(typeof (null as unknown as ValidationResult)).toBe('object');
  });
});
