import { describe, it, expect } from '@jest/globals';
import { MetricsStore } from '../src/metrics-store';
import * as types from '../src/types';

describe('metrics-store', () => {
  it('exports MetricsStore class', () => {
    expect(MetricsStore).toBeDefined();
    expect(typeof MetricsStore).toBe('function');
  });

  it('types are exported', () => {
    expect(types).toBeDefined();
    expect(typeof types).toBe('object');
  });

  it('MetricsStore constructor signature accepts 3 args', () => {
    expect(MetricsStore.length).toBe(3);
  });
});
