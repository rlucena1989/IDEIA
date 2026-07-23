import { EventEmitter } from 'events';
import { LoopConfig } from './types';

export class LoopScheduler extends EventEmitter {
  private timer: ReturnType<typeof setInterval> | null = null;
  private config: LoopConfig | null = null;

  start(config: LoopConfig): void {
    if (this.timer) this.stop();
    this.config = config;
    this.timer = setInterval(() => {
      this.emit('tick', Date.now());
    }, config.checkIntervalMs);

    if (typeof this.timer === 'object' && 'unref' in this.timer) {
      this.timer.unref();
    }
  }

  stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    this.config = null;
  }

  isRunning(): boolean {
    return this.timer !== null;
  }
}
