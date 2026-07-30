import { performance} from 'perf_hooks';
import { createLogger } from '@ideia/logger';

const logger = createLogger('performance-monitor:startup-profiler');

export interface StartupPhase {
  name: string;
  durationMs: number;
  startTime: number;
  endTime: number;
  status: 'pending' | 'running' | 'completed' | 'failed';
}

export interface StartupReport {
  totalDurationMs: number;
  phases: StartupPhase[];
  environment: {
    platform: string;
    nodeVersion: string;
    memoryMB: number;
    cpus: number;
  };
  timestamp: string;
}

export class StartupProfiler {
  private phases: StartupPhase[] = [];
  private currentPhase: string | null = null;
  private marks = new Map<string, number>();
  private enabled: boolean;

  constructor(enabled = true) {
    this.enabled = enabled;
  }

  setEnabled(v: boolean): void {
    this.enabled = v;
  }

  beginPhase(name: string): void {
    if (!this.enabled) return;
    if (this.currentPhase) this.endPhase(this.currentPhase);
    this.currentPhase = name;
    const time = performance.now();
    this.marks.set(`phase:${name}:start`, time);
    this.phases.push({
      name,
      durationMs: 0,
      startTime: time,
      endTime: 0,
      status: 'running',
    });
  }

  endPhase(name: string): void {
    if (!this.enabled) return;
    const phase = this.phases.find(p => p.name === name && p.status === 'running');
    if (!phase) return;
    const endTime = performance.now();
    phase.endTime = endTime;
    phase.durationMs = endTime - phase.startTime;
    phase.status = 'completed';
    if (this.currentPhase === name) this.currentPhase = null;
  }

  failPhase(name: string, error?: string): void {
    if (!this.enabled) return;
    const phase = this.phases.find(p => p.name === name && p.status === 'running');
    if (!phase) return;
    phase.endTime = performance.now();
    phase.durationMs = phase.endTime - phase.startTime;
    phase.status = 'failed';
    if (error) logger.error(`Phase "${name}" failed: ${error}`);
    if (this.currentPhase === name) this.currentPhase = null;
  }

  generateReport(): StartupReport {
    const totalDuration = performance.now();
    const completed = this.phases.filter(p => p.status === 'completed');
    const lastEnd = completed.length > 0 ? Math.max(...completed.map(p => p.endTime)) : totalDuration;

    return {
      totalDurationMs: lastEnd,
      phases: [...this.phases],
      environment: {
        platform: process.platform,
        nodeVersion: process.version,
        memoryMB: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
        cpus: require('os').cpus().length,
      },
      timestamp: new Date().toISOString(),
    };
  }

  getCriticalPath(): StartupPhase[] {
    const completed = this.phases.filter(p => p.status === 'completed');
    completed.sort((a, b) => a.startTime - b.startTime);
    return completed.slice(0, 3);
  }
}

export function createStartupProfiler(enabled?: boolean): StartupProfiler {
  return new StartupProfiler(enabled);
}
