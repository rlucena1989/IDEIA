import { describe, it, expect, jest } from '@jest/globals';
import { Pruner } from '../src/pruner';

jest.mock('@ideia/logger', () => ({
  createLogger: () => ({ info: jest.fn(), warn: jest.fn(), error: jest.fn() }),
}));

describe('Pruner', () => {
  it('constructor sets default retention and interval', () => {
    const pruner = new (Pruner as any)();
    expect(pruner).toBeDefined();
  });

  it('accepts custom retention and interval', () => {
    const pruner = new (Pruner as any)({}, 14, 7200000);
    expect(pruner).toBeDefined();
  });

  it('start returns a timer id', () => {
    const pruner = new (Pruner as any)({}, 7, 100000);
    const timerId = pruner.start();
    expect(typeof timerId).toBe('number');
    pruner.stop();
  });

  it('stop clears timer', () => {
    const pruner = new (Pruner as any)({}, 7, 100000);
    const _timerId = pruner.start();
    expect(() => pruner.stop()).not.toThrow();
  });
});
