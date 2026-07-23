import { describe, it, expect } from '@jest/globals';
import { runEngineOnce } from '../engine';

describe('engine', () => {
  it('runEngineOnce should be defined', () => {
    expect(runEngineOnce).toBeDefined();
  });
  it('runEngineOnce should be a function', () => {
    expect(typeof runEngineOnce).toBe('function');
  });
});
