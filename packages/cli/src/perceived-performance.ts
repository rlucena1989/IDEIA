import { createLogger } from '@ideia/logger';

const logger = createLogger('cli:perceived-performance');

export interface PerfPhase {
  name: string;
  estimatedMs: number;
  startedAt: number;
  completedAt: number | null;
}

export interface PerfProgress {
  currentPhase: string;
  progress: number;
  etaMs: number;
  elapsedMs: number;
  phases: PerfPhase[];
}

export class PerceivedPerformance {
  private phases: PerfPhase[] = [];
  private currentPhaseIdx = -1;
  private startTime = 0;
  private totalEstimated = 0;

  start(phases: Array<{ name: string; estimatedMs: number }>): void {
    this.startTime = performance.now();
    this.phases = phases.map(p => ({ name: p.name, estimatedMs: p.estimatedMs, startedAt: 0, completedAt: null }));
    this.totalEstimated = phases.reduce((acc, p) => acc + p.estimatedMs, 0);
    logger.info('Starting perceived performance tracking', { phases: phases.length, totalEstimated: this.totalEstimated });
  }

  beginPhase(name: string): void {
    const idx = this.phases.findIndex(p => p.name === name);
    if (idx >= 0) {
      this.currentPhaseIdx = idx;
      this.phases[idx].startedAt = performance.now();
    }
  }

  completePhase(name: string): void {
    const idx = this.phases.findIndex(p => p.name === name);
    if (idx >= 0) {
      this.phases[idx].completedAt = performance.now();
      if (this.currentPhaseIdx === idx) {
        this.currentPhaseIdx = -1;
      }
    }
  }

  showSkeleton(): void {
    if (typeof process !== 'undefined' && process.stdout) {
      process.stdout.write('\n');
      for (const phase of this.phases) {
        const completed = phase.completedAt !== null;
        const active = this.phases[this.currentPhaseIdx]?.name === phase.name && !completed;
        const icon = completed ? '✅' : active ? '⏳' : '⬜';
        process.stdout.write(`  ${icon} ${phase.name}\n`);
      }
      process.stdout.write('\n');
    }
  }

  showProgressBar(current: number, total: number, label?: string): void {
    if (typeof process === 'undefined' || !process.stdout) return;
    const width = 30;
    const progress = total > 0 ? Math.min(current / total, 1) : 0;
    const filled = Math.round(width * progress);
    const bar = '█'.repeat(filled) + '░'.repeat(width - filled);
    const pct = Math.round(progress * 100);
    const elapsed = performance.now() - this.startTime;
    const eta = progress > 0 ? Math.round(elapsed / progress - elapsed) : 0;
    const msg = label ? ` ${label}` : '';
    process.stdout.write(`\r  [${bar}] ${pct}%${msg} | ETA: ${this.formatTime(eta)}`);
  }

  showEta(phaseName: string, current: number, total: number): void {
    const elapsed = performance.now() - (this.phases.find(p => p.name === phaseName)?.startedAt ?? this.startTime);
    const progress = total > 0 ? current / total : 0;
    const eta = progress > 0 ? Math.round(elapsed / progress - elapsed) : 0;
    logger.info(`Phase "${phaseName}": ${current}/${total} (${Math.round(progress * 100)}%) ETA: ${this.formatTime(eta)}`);
  }

  getProgress(): PerfProgress {
    const completedPhases = this.phases.filter(p => p.completedAt !== null).length;
    const elapsedMs = Math.round(performance.now() - this.startTime);
    const progress = this.totalEstimated > 0 ? completedPhases / this.phases.length : 0;
    const etaMs = progress > 0 ? Math.round(elapsedMs / progress - elapsedMs) : this.totalEstimated;

    return {
      currentPhase: this.phases[this.currentPhaseIdx]?.name ?? '',
      progress: Math.round(progress * 100),
      etaMs: Math.max(0, etaMs),
      elapsedMs,
      phases: [...this.phases],
    };
  }

  end(): number {
    const elapsed = Math.round(performance.now() - this.startTime);
    logger.info('Perceived performance tracking ended', { elapsedMs: elapsed });
    return elapsed;
  }

  private formatTime(ms: number): string {
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${Math.round(ms / 1000)}s`;
    return `${Math.floor(ms / 60000)}m ${Math.round((ms % 60000) / 1000)}s`;
  }
}
