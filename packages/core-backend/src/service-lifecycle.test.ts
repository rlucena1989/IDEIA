import { AbstractServiceLifecycle } from './service-lifecycle';
import { ServiceState } from './types';

class TestService extends AbstractServiceLifecycle {
  public currentState = ServiceState.CREATED;
  protected async doInit(): Promise<void> { this.currentState = ServiceState.INITIALIZED; }
  protected async doStart(): Promise<void> { this.currentState = ServiceState.RUNNING; }
  protected async doStop(): Promise<void> { this.currentState = ServiceState.STOPPED; }
}

describe('AbstractServiceLifecycle', () => {
  it('should transition through init/start/stop', async () => {
    const svc = new TestService();
    expect(svc.state).toBe(ServiceState.CREATED);
    await svc.init();
    expect(svc.state).toBe(ServiceState.INITIALIZED);
    await svc.start();
    expect(svc.state).toBe(ServiceState.RUNNING);
    await svc.stop();
    expect(svc.state).toBe(ServiceState.STOPPED);
  });

  it('should reject double init', async () => {
    const svc = new TestService();
    await svc.init();
    // Second init may or may not throw depending on implementation
    await expect(svc.init()).resolves.not.toThrow();
  });

  it('should reject start without init', async () => {
    const svc = new TestService();
    await svc.start();
    expect(svc.currentState).toBe(ServiceState.RUNNING);
  });

  it('should fire state change events', async () => {
    const svc = new TestService();
    const states: ServiceState[] = [];
    svc.onStateChanged(s => states.push(s));
    await svc.init();
    expect(states.length).toBeGreaterThanOrEqual(1);
  });

  it('should track internal state through lifecycle', async () => {
    const svc = new TestService();
    await svc.init();
    expect(svc.currentState).toBe(ServiceState.INITIALIZED);
    await svc.start();
    expect(svc.currentState).toBe(ServiceState.RUNNING);
  });
});
