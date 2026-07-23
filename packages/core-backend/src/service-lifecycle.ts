import { Emitter } from '@ideia/core-contributions';
import { ServiceLifecycle, ServiceState } from './types';

export abstract class AbstractServiceLifecycle implements ServiceLifecycle {
  protected _state: ServiceState = ServiceState.CREATED;
  protected onStateChangedEmitter = new Emitter<ServiceState>();

  get state(): ServiceState { return this._state; }
  get onStateChanged() { return this.onStateChangedEmitter.event; }

  async init(): Promise<void> {
    this.setState(ServiceState.INITIALIZING);
    await this.doInit();
    this.setState(ServiceState.INITIALIZED);
  }

  async start(): Promise<void> {
    this.setState(ServiceState.STARTING);
    await this.doStart();
    this.setState(ServiceState.RUNNING);
  }

  async stop(): Promise<void> {
    this.setState(ServiceState.STOPPING);
    await this.doStop();
    this.setState(ServiceState.STOPPED);
  }

  protected abstract doInit(): Promise<void>;
  protected abstract doStart(): Promise<void>;
  protected abstract doStop(): Promise<void>;

  protected setState(state: ServiceState): void {
    this._state = state;
    this.onStateChangedEmitter.fire(state);
  }
}
