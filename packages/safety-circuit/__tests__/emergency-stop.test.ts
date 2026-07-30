import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { EmergencyStop, createEmergencyStop } from '../src/e-stop';

jest.mock('@ideia/event-bus', () => ({
  EventBus: jest.fn(() => ({ emit: jest.fn() })),
}));
jest.mock('@ideia/audit-trail', () => ({
  AuditTrail: jest.fn(() => ({ append: jest.fn().mockReturnValue({ eventId: 'mock', timestamp: new Date().toISOString() }) })),
}));
jest.mock('@ideia/logger', () => ({
  createLogger: jest.fn(() => ({
    info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn(), fatal: jest.fn(), child: jest.fn(),
  })),
}));

describe('EmergencyStop', () => {
  let estop: EmergencyStop;

  beforeEach(() => {
    jest.clearAllMocks();
    estop = new EmergencyStop();
  });

  it('constructs and is not engaged by default', () => {
    expect(estop).toBeDefined();
    expect(estop.isEngaged()).toBe(false);
  });

  it('engage sets engaged state', async () => {
    await estop.engage('cli', 'Test emergency', 'tester');
    expect(estop.isEngaged()).toBe(true);
  });

  it('engage via disabled channel does nothing', async () => {
    const restricted = new EmergencyStop(undefined, undefined, {
      channels: { cli: false, api: true, keyboard: true, autoDetect: true },
    });
    await restricted.engage('cli', 'Test', 'tester');
    expect(restricted.isEngaged()).toBe(false);
  });

  it('engage sets engaged', async () => {
    await estop.engage('cli', 'Pausing execution', 'admin');
    expect(estop.isEngaged()).toBe(true);
  });

  it('recover clears engaged state', async () => {
    await estop.engage('cli', 'Rolling back changes', 'admin');
    expect(estop.isEngaged()).toBe(true);
    await estop.recover('rollback');
    expect(estop.isEngaged()).toBe(false);
  });

  it('recover resume clears engaged state', async () => {
    await estop.engage('cli', 'stop', 'tester');
    expect(estop.isEngaged()).toBe(true);
    await estop.recover('resume');
    expect(estop.isEngaged()).toBe(false);
  });

  it('recover with rollback returns rollback mode', async () => {
    const mode = await estop.recover('rollback');
    expect(mode).toBe('rollback');
    expect(estop.isEngaged()).toBe(false);
  });

  it('recover with resume returns normal mode', async () => {
    const mode = await estop.recover('resume');
    expect(mode).toBe('normal');
  });

  it('recover with continue returns degraded mode', async () => {
    const mode = await estop.recover('continue');
    expect(mode).toBe('degraded');
  });

  it('onEstop registers and deregisters listeners', async () => {
    const listener = jest.fn();
    const deregister = estop.onEstop(listener as unknown as (event: { channel: string; reason: string }) => void | Promise<void>);
    await estop.engage('api', 'test engage', 'tester');
    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener).toHaveBeenCalledWith(
      expect.objectContaining({ channel: 'api', reason: 'test engage' })
    );
    listener.mockClear();
    deregister();
    await estop.engage('api', 'after deregister', 'tester');
    expect(listener).not.toHaveBeenCalled();
  });

  it('getConfig returns current configuration', () => {
    const config = estop.getConfig();
    expect(config.channels.cli).toBe(true);
    expect(config.checkpointDir).toBe('.ideia/checkpoints');
  });

  it('updateConfig merges channel settings', () => {
    estop.updateConfig({ channels: { cli: false, api: true, keyboard: true, autoDetect: true } });
    expect(estop.getConfig().channels.cli).toBe(false);
  });

  it('createEmergencyStop factory works', () => {
    const instance = createEmergencyStop();
    expect(instance).toBeInstanceOf(EmergencyStop);
  });
});
