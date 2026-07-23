import { describe, it, expect } from '@jest/globals';
import { loadConfig } from '../src/config';
import { defaultThresholds } from '../src/thresholds';
import { JsonCache } from '../src/cache';

describe('acceleration', () => {
  it('loadConfig returns default config', () => {
    const config = loadConfig();
    expect(config).toBeDefined();
    expect(typeof config.mode).toBe('string');
    expect(typeof config.concurrency).toBe('number');
  });

  it('defaultThresholds has expected structure', () => {
    expect(defaultThresholds).toBeDefined();
    expect(typeof defaultThresholds.scorecardMin).toBe('number');
    expect(typeof defaultThresholds.coverageMin).toBe('number');
  });

  it('JsonCache can be constructed', () => {
    const cache = new JsonCache(':memory:', 100, true);
    expect(cache).toBeDefined();
    expect(cache.size).toBe(0);
    expect(cache.hits).toBe(0);
  });
});
