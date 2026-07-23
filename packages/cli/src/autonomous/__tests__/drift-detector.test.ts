import { describe, it, expect } from '@jest/globals';
import { detectDrift } from '../drift-detector';

describe('drift-detector', () => {
  it('detectDrift should be defined', () => {
    expect(detectDrift).toBeDefined();
  });

  it('should return null for small delta', () => {
    expect(detectDrift(88, 90)).toBeNull();
  });

  it('should detect medium drift', () => {
    const d = detectDrift(75, 85);
    expect(d).not.toBeNull();
    expect(d?.severity).toBe('medium');
  });

  it('should detect high drift', () => {
    const d = detectDrift(70, 85);
    expect(d?.severity).toBe('high');
  });

  it('should detect critical drift', () => {
    const d = detectDrift(60, 85);
    expect(d?.severity).toBe('critical');
  });
});
