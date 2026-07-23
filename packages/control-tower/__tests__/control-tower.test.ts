import { describe, it, expect } from '@jest/globals';
import { ControlTower, createControlTower } from '../src/control-tower';

describe('control-tower', () => {
  it('ControlTower can be constructed with no deps', () => {
    const tower = new ControlTower();
    expect(tower).toBeDefined();
  });

  it('getStatus returns default status', () => {
    const tower = new ControlTower();
    const status = tower.getStatus();
    expect(status).toBeDefined();
    expect(typeof status.healthPercent).toBe('number');
    expect(typeof status.autonomyLevel).toBe('string');
  });

  it('createControlTower factory works', () => {
    const tower = createControlTower();
    expect(tower).toBeDefined();
    expect(tower.getStatus()).toBeDefined();
  });
});
