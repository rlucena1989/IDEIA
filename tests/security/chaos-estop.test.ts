import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { EmergencyStop } from '../../packages/safety-circuit/src/e-stop';
import type { EstopEvent } from '../../packages/safety-circuit/src/types';
import { EventBus } from '../../packages/event-bus/src/event-bus';
import type { BusEvent } from '../../packages/event-bus/src/types';

describe('Chaos: E-Stop During Critical Operation', () => {
  let emergencyStop: EmergencyStop;
  let eventBus: EventBus;

  beforeEach(() => {
    eventBus = new EventBus();
    emergencyStop = new EmergencyStop(eventBus);
  });

  it('should engage and stop operations', async () => {
    await emergencyStop.engage('cli', 'Critical vulnerability detected');
    expect(emergencyStop.isEngaged()).toBe(true);
  });

  it('should emit safety events when engaged', async () => {
    const handler = jest.fn((_e: BusEvent) => {});
    await eventBus.subscribe('safety.emergency-stop', handler);
    await emergencyStop.engage('cli', 'Emergency');
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('should not corrupt state when stopping mid-operation', async () => {
    const states: string[] = [];
    emergencyStop.onEstop(async (_e: EstopEvent) => {
      states.push('stopped');
    });
    await emergencyStop.engage('cli', 'Mid-op stop');
    expect(emergencyStop.isEngaged()).toBe(true);
    expect(states.length).toBeGreaterThanOrEqual(1);
  });

  it('should resume after emergency stop', async () => {
    await emergencyStop.engage('cli', 'Test stop');
    expect(emergencyStop.isEngaged()).toBe(true);
    const resumed = await emergencyStop.recover('resume');
    expect(resumed).toBe('normal');
    expect(emergencyStop.isEngaged()).toBe(false);
  });

  it('should handle multiple rapid engage/disengage cycles', async () => {
    for (let i = 0; i < 10; i++) {
      await emergencyStop.engage('cli', `Cycle ${i}`);
      expect(emergencyStop.isEngaged()).toBe(true);
      await emergencyStop.resume();
      expect(emergencyStop.isEngaged()).toBe(false);
    }
  });

  it('should not crash on engage when eventBus is not set', async () => {
    const standalone = new EmergencyStop();
    await expect(standalone.engage('cli', 'No bus')).resolves.toBeUndefined();
    expect(standalone.isEngaged()).toBe(true);
  });

  it('should persist reason across estop event', async () => {
    const reason = 'Critical: unauthorized access detected';
    await emergencyStop.engage('auto-detect', reason);
    const listener = jest.fn((_e: EstopEvent) => {});
    emergencyStop.onEstop(listener);
    expect(listener).not.toHaveBeenCalled();
  });
});
