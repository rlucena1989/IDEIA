import { describe, it, expect } from '@jest/globals';
import { detectPatterns } from '../pattern-detector';
import { createMemoryRecord } from '@ideia/memory-store';

describe('pattern-detector', () => {
  it('detectPatterns should be defined', () => {
    expect(detectPatterns).toBeDefined();
  });

  it('should return empty for no records', () => {
    expect(detectPatterns([])).toEqual([]);
  });

  it('should detect pattern with frequency >= 2', () => {
    const records = [
      createMemoryRecord({ category: 'failure', source: 't', summary: 'F1', tags: ['consistency'] }),
      createMemoryRecord({ category: 'failure', source: 't', summary: 'F2', tags: ['consistency'] }),
    ];
    const patterns = detectPatterns(records);
    expect(patterns.length).toBe(1);
    expect(patterns[0].frequency).toBe(2);
    expect(patterns[0].confidence).toBeGreaterThan(0.5);
  });
});
