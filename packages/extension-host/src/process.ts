import { Emitter, Disposable } from '@ideia/core-contributions';
import { createLogger } from '@ideia/logger';
import { ExtensionHostProcess } from './types';

export class DefaultExtensionHostProcess implements ExtensionHostProcess {
  readonly pid: number | undefined;
  private _alive = false;
  private onStartedEmitter = new Emitter<void>();
  private onStoppedEmitter = new Emitter<void>();
  private onCrashedEmitter = new Emitter<Error>();

  get onStarted() { return this.onStartedEmitter.event; }
  get onStopped() { return this.onStoppedEmitter.event; }
  get onCrashed() { return this.onCrashedEmitter.event; }

  get alive(): boolean { return this._alive; }

  async start(): Promise<void> {
    if (this._alive) return;
    this._alive = true;
    this.onStartedEmitter.fire(void 0);
  }

  async stop(): Promise<void> {
    if (!this._alive) return;
    this._alive = false;
    this.onStoppedEmitter.fire(void 0);
  }

  async restart(): Promise<void> {
    await this.stop();
    await this.start();
  }

  async healthCheck(): Promise<boolean> {
    return this._alive;
  }
}
