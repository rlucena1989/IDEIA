import { describe, it, expect } from '@jest/globals';
import { SafetyCircuit, createSafetyCircuit } from '../src/safety-circuit';
import { EmergencyStop, createEmergencyStop as _createEmergencyStop } from '../src/e-stop';

describe('safety-circuit', () => {
  it('SafetyCircuit can be constructed with no deps', () => {
    const sc = new SafetyCircuit();
    expect(sc).toBeDefined();
  });

  it('getStatus returns default status', () => {
    const sc = new SafetyCircuit();
    const status = sc.getStatus();
    expect(status).toBeDefined();
    expect(status.mode).toBe('normal');
    expect(Array.isArray(status.activeTriggers)).toBe(true);
  });

  it('createSafetyCircuit factory works', () => {
    const sc = createSafetyCircuit();
    expect(sc).toBeDefined();
  });

  it('EmergencyStop can be constructed', () => {
    const estop = new EmergencyStop();
    expect(estop).toBeDefined();
    expect(estop.isEngaged()).toBe(false);
  });
});
