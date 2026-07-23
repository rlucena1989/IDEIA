import { describe, it, expect } from '@jest/globals';
import { AutoAdr, createAutoAdr } from '../src/index';

describe('auto-adr', () => {
  it('exports AutoAdr class', () => {
    expect(AutoAdr).toBeDefined();
    expect(typeof AutoAdr).toBe('function');
  });

  it('exports createAutoAdr factory', () => {
    expect(createAutoAdr).toBeDefined();
    expect(typeof createAutoAdr).toBe('function');
  });

  it('can import types', () => {
    const types = require('../src/types');
    expect(types).toBeDefined();
  });
});
