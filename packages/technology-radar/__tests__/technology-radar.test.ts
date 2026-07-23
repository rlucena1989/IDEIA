import { describe, it, expect } from '@jest/globals';
import { TechnologyRadar, createTechnologyRadar } from '../src/technology-radar';
import * as types from '../src/types';

describe('technology-radar', () => {
  it('exports TechnologyRadar class', () => {
    expect(TechnologyRadar).toBeDefined();
    expect(typeof TechnologyRadar).toBe('function');
  });

  it('exports createTechnologyRadar factory', () => {
    expect(typeof createTechnologyRadar).toBe('function');
  });

  it('types are exported', () => {
    expect(types).toBeDefined();
    expect(typeof types).toBe('object');
  });
});
