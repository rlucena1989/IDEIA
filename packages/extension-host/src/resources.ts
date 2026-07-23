import { Emitter } from '@ideia/core-contributions';
import { ResourceMonitor, ResourceLimits } from './types';

export class DefaultResourceMonitor implements ResourceMonitor {
  private limits: ResourceLimits;
  private onWarningEmitter = new Emitter<ResourceLimits>();

  get onResourceWarning() { return this.onWarningEmitter.event; }

  constructor(limits?: Partial<ResourceLimits>) {
    this.limits = {
      maxMemory: limits?.maxMemory ?? 512 * 1024 * 1024,
      maxCpu: limits?.maxCpu ?? 80,
      maxProcesses: limits?.maxProcesses ?? 4,
      timeout: limits?.timeout ?? 30000,
    };
  }

  getMemoryUsage(): number {
    return process.memoryUsage().heapUsed;
  }

  getCpuUsage(): number {
    return 0;
  }

  isWithinLimits(): boolean {
    const memOk = this.getMemoryUsage() <= this.limits.maxMemory;
    const cpuOk = this.getCpuUsage() <= this.limits.maxCpu;
    if (!memOk || !cpuOk) {
      this.onWarningEmitter.fire(this.limits);
      return false;
    }
    return true;
  }
}
