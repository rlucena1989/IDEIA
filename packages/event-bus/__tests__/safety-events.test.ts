import { EventBus } from '../src/event-bus';

describe('Safety Events', () => {
  it('should emit and receive safety.breaker_tripped', async () => {
    const bus = new EventBus();
    const handler = jest.fn();
    await bus.subscribe('safety.breaker_tripped', handler);
    await bus.emit({
      type: 'safety.breaker_tripped',
      source: 'circuit-breaker',
      payload: { safety: { breakerType: 'error-rate', threshold: 10, currentValue: 15 } },
    });
    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler.mock.calls[0][0].type).toBe('safety.breaker_tripped');
    expect(handler.mock.calls[0][0].payload?.safety).toBeDefined();
  });

  it('should emit and receive safety.estop', async () => {
    const bus = new EventBus();
    const handler = jest.fn();
    await bus.subscribe('safety.estop', handler);
    await bus.emit({
      type: 'safety.estop',
      source: 'emergency-stop',
      payload: { safety: { channel: 'cli', reason: 'User requested stop' } },
    });
    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler.mock.calls[0][0].payload?.safety).toBeDefined();
  });

  it('should emit and receive safety.level_changed', async () => {
    const bus = new EventBus();
    const handler = jest.fn();
    await bus.subscribe('safety.level_changed', handler);
    await bus.emit({
      type: 'safety.level_changed',
      source: 'autonomy',
      payload: { control: { previousLevel: 'N2', newLevel: 'N3' } },
    });
    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler.mock.calls[0][0].type).toBe('safety.level_changed');
  });

  it('should emit and receive safety.paused', async () => {
    const bus = new EventBus();
    const handler = jest.fn();
    await bus.subscribe('safety.paused', handler);
    await bus.emit({
      type: 'safety.paused',
      source: 'safety-circuit',
      payload: { safety: { reason: 'Loop detected', triggeredBy: 'system' } },
    });
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('should emit and receive safety.resumed', async () => {
    const bus = new EventBus();
    const handler = jest.fn();
    await bus.subscribe('safety.resumed', handler);
    await bus.emit({
      type: 'safety.resumed',
      source: 'emergency-stop',
      payload: { safety: { timestamp: new Date().toISOString(), triggeredBy: 'admin' } },
    });
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('should emit and receive scope.violation.detected', async () => {
    const bus = new EventBus();
    const handler = jest.fn();
    await bus.subscribe('scope.violation.detected', handler);
    await bus.emit({
      type: 'scope.violation.detected',
      source: 'scope-isolation',
      payload: { scope: { fromScope: 'self', targetPath: '/etc/passwd' } },
    });
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('should support wildcard subscription for all safety events', async () => {
    const bus = new EventBus();
    const handler = jest.fn();
    await bus.subscribe('*', handler);
    await bus.emit({ type: 'safety.breaker_tripped', source: 'test' });
    await bus.emit({ type: 'safety.estop', source: 'test' });
    await bus.emit({ type: 'safety.level_changed', source: 'test' });
    await bus.emit({ type: 'safety.paused', source: 'test' });
    await bus.emit({ type: 'safety.resumed', source: 'test' });
    await bus.emit({ type: 'scope.violation.detected', source: 'test' });
    expect(handler).toHaveBeenCalledTimes(6);
  });

  it('should maintain correct payload structure for safety events', async () => {
    const bus = new EventBus();
    const handler = jest.fn();
    await bus.subscribe('safety.level_changed', handler);
    const event = await bus.emit({
      type: 'safety.level_changed',
      source: 'autonomy',
      payload: { control: { previousLevel: 'N2', newLevel: 'N4' } },
      metadata: { triggeredBy: 'admin' },
    });
    expect(event.id).toBeDefined();
    expect(event.timestamp).toBeDefined();
    expect(event.source).toBe('autonomy');
    expect(event.payload?.control).toEqual({ previousLevel: 'N2', newLevel: 'N4' });
    expect(event.metadata?.triggeredBy).toBe('admin');
  });

  it('should allow subscribing once to safety events', async () => {
    const bus = new EventBus();
    const handler = jest.fn();
    await bus.subscribeOnce('safety.emergency-stop', handler);
    await bus.emit({ type: 'safety.emergency-stop', source: 'test' });
    await bus.emit({ type: 'safety.emergency-stop', source: 'test' });
    expect(handler).toHaveBeenCalledTimes(1);
  });
});
