import { readHardwareProfile } from './hardware-profile';
import { createLogger } from '@ideia/logger';
import { HardwareProfile } from './types';
const logger = createLogger('resource-monitor');

export class ResourceMonitor {
  private samples: HardwareProfile[] = [];
  private intervalId: NodeJS.Timeout | null = null;
  private running = false;

  start(intervalMs = 5000): void {
    if (this.running) return;
    this.running = true;
    this.intervalId = setInterval(() => {
      this.samples.push(readHardwareProfile());
      if (this.samples.length > 60) this.samples.shift();
    }, intervalMs);
  }

  stop(): void {
    if (this.intervalId) clearInterval(this.intervalId);
    this.running = false;
  }

  getAverageCpuUsage(): number {
    if (this.samples.length === 0) return 0;
    return this.samples.reduce((a, s) => a + s.cpuUsage, 0) / this.samples.length;
  }

  getAverageRamFreeGb(): number {
    if (this.samples.length === 0) return 0;
    return this.samples.reduce((a, s) => a + s.ramFreeGb, 0) / this.samples.length;
  }

  getLatest(): HardwareProfile | null {
    return this.samples.length > 0 ? this.samples[this.samples.length - 1] : null;
  }

  isResourceConstrained(): boolean {
    const avg = this.getAverageCpuUsage();
    const latest = this.getLatest();
    if (!latest) return false;
    return avg > 0.8 || latest.ramFreeGb < 0.5;
  }

  get sampleCount(): number {
    return this.samples.length;
  }
}

export const globalMonitor = new ResourceMonitor();
