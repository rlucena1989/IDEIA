import * as os from 'os';
import { createLogger } from '@ideia/logger';
import { ResourceSnapshot, MemoryTrend, ResourceBudget } from './types';
const logger = createLogger('monitor');

export class ResourceMonitor {
  private samples: ResourceSnapshot[] = [];
  private maxSamples: number;
  private windowMs: number;

  constructor(maxSamples: number = 12, windowMs: number = 60000) {
    this.maxSamples = maxSamples;
    this.windowMs = windowMs;
  }

  snapshot(): ResourceSnapshot {
    const mem = process.memoryUsage();
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const cpuLoad = os.loadavg();
    const cores = os.cpus().length;

    const snapshot: ResourceSnapshot = {
      timestamp: Date.now(),
      memory: {
        totalMB: Math.round(totalMem / 1024 / 1024),
        freeMB: Math.round(freeMem / 1024 / 1024),
        usedPercent: Math.round(((totalMem - freeMem) / totalMem) * 100),
        processHeapUsedMB: Math.round(mem.heapUsed / 1024 / 1024),
        processHeapTotalMB: Math.round(mem.heapTotal / 1024 / 1024),
        processRSSMB: Math.round(mem.rss / 1024 / 1024),
        processExternalMB: Math.round((mem.external ?? 0) / 1024 / 1024),
      },
      cpu: {
        loadAvg1m: cpuLoad[0] ?? 0,
        loadAvg5m: cpuLoad[1] ?? 0,
        loadAvg15m: cpuLoad[2] ?? 0,
        cores,
        percentEstimate: Math.round(((cpuLoad[0] ?? 0) / cores) * 100),
      },
      uptime: os.uptime(),
      platform: os.platform(),
    };

    this.samples.push(snapshot);
    this.prune();
    return snapshot;
  }

  private prune(): void {
    const cutoff = Date.now() - this.windowMs;
    this.samples = this.samples.filter(s => s.timestamp >= cutoff);
    while (this.samples.length > this.maxSamples) {
      this.samples.shift();
    }
  }

  getSamples(): ResourceSnapshot[] {
    return [...this.samples];
  }

  getLastSnapshot(): ResourceSnapshot | null {
    return this.samples.length > 0 ? this.samples[this.samples.length - 1] : null;
  }

  analyzeMemoryTrend(): MemoryTrend {
    const recent = this.samples;
    if (recent.length < 3) {
      return { slope: 0, intercept: 0, recentSamples: recent, isLeaking: false, leakRateMBperMin: 0, projectedOOMminutes: null };
    }

    const times = recent.map((s, _idx) => (s.timestamp - (recent[0]?.timestamp ?? s.timestamp)) / 1000 / 60);
    const heapValues = recent.map(s => s.memory.processHeapUsedMB);

    const n = times.length;
    const sumX = times.reduce((a, b) => a + b, 0);
    const sumY = heapValues.reduce((a, b) => a + b, 0);
    const sumXY = times.reduce((a, b, i) => a + b * heapValues[i], 0);
    const sumX2 = times.reduce((a, b) => a + b * b, 0);

    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;

    const leakRateMBperMin = Math.max(0, Math.round(slope * 100) / 100);
    const isLeaking = leakRateMBperMin > 1;

    let projectedOOMminutes: number | null = null;
    if (isLeaking) {
      const lastHeap = heapValues[heapValues.length - 1];
      const totalMB = (os.totalmem() / 1024 / 1024) * 0.8;
      const remainingMB = totalMB - lastHeap;
      if (remainingMB > 0 && leakRateMBperMin > 0) {
        projectedOOMminutes = Math.round(remainingMB / leakRateMBperMin);
      }
    }

    return { slope, intercept, recentSamples: recent, isLeaking, leakRateMBperMin, projectedOOMminutes };
  }

  checkBudget(budget: ResourceBudget): { ok: boolean; violations: string[] } {
    const snap = this.getLastSnapshot();
    if (!snap) return { ok: true, violations: [] };

    const violations: string[] = [];
    if (snap.memory.usedPercent > budget.maxMemoryPercent) {
      violations.push(`Memory ${snap.memory.usedPercent}% > ${budget.maxMemoryPercent}%`);
    }
    if (snap.cpu.percentEstimate > budget.maxCPUPercent) {
      violations.push(`CPU ${snap.cpu.percentEstimate}% > ${budget.maxCPUPercent}%`);
    }
    if (snap.memory.processHeapUsedMB > budget.maxProcessHeapMB) {
      violations.push(`Process heap ${snap.memory.processHeapUsedMB}MB > ${budget.maxProcessHeapMB}MB`);
    }

    return { ok: violations.length === 0, violations };
  }

  reset(): void {
    this.samples = [];
  }
}
