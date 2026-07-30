import { createLogger } from '@ideia/logger';

const logger = createLogger('cli:startup-stream');

export interface StartupPhase {
  name: string;
  weight: number;
  loaded: boolean;
  durationMs: number;
  timeoutMs?: number;
  skipped?: boolean;
  error?: string;
  dependsOn?: readonly string[];
}

export interface StartupReport {
  totalDurationMs: number;
  perceivedDurationMs: number;
  phases: StartupPhase[];
  score: number;
  criticalPathDurationMs: number;
  nonCriticalPathDurationMs: number;
  skippedPhases: string[];
  failedPhases: string[];
}

export type PhaseLoader = () => Promise<void>;

interface InternalPhase {
  name: string;
  weight: number;
  loader: PhaseLoader;
  critical: boolean;
  timeoutMs: number;
  dependsOn: readonly string[];
}

export class StartupStream {
  private phases: InternalPhase[] = [];
  private completions: StartupPhase[] = [];
  private startTime = 0;
  private uiReady = false;

  registerPhase(
    name: string,
    weight: number,
    loader: PhaseLoader,
    critical = false,
    timeoutMs = 0,
    dependsOn: readonly string[] = [],
  ): void {
    this.phases.push({ name, weight, loader, critical, timeoutMs, dependsOn });
  }

  async start(): Promise<void> {
    this.startTime = performance.now();
    logger.info('Startup stream started');

    const critical = this.phases.filter(p => p.critical);
    const nonCritical = this.phases.filter(p => !p.critical);

    const criticalPromise = this.runPhases(critical);

    criticalPromise.then(() => {
      this.uiReady = true;
      if (nonCritical.length > 0) {
        this.runPhases(nonCritical).catch(err => {
          logger.error('Non-critical startup phase failed', { error: String(err) });
        });
      }
    });

    await criticalPromise;
  }

  private async runPhases(phases: InternalPhase[]): Promise<void> {
    const sorted = this.topologicalSort(phases);
    let intervalId: ReturnType<typeof setInterval> | undefined;

    for (const phase of sorted) {
      const deps = phase.dependsOn.filter(d => !this.completions.some(c => c.name === d));
      if (deps.length > 0) {
        logger.warn(`Phase "${phase.name}" skipped: unmet dependencies ${deps.join(', ')}`);
        this.completions.push({
          name: phase.name,
          weight: phase.weight,
          loaded: false,
          durationMs: 0,
          skipped: true,
          error: `Unmet dependencies: ${deps.join(', ')}`,
        });
        continue;
      }

      const start = performance.now();
      let timedOut = false;
      let timeoutHandle: ReturnType<typeof setTimeout> | undefined;

      if (phase.timeoutMs > 0) {
        timeoutHandle = setTimeout(() => { timedOut = true; }, phase.timeoutMs);
      }

      const timeoutPromise = new Promise<void>((_, reject) => {
        intervalId = setInterval(() => {
          if (timedOut) {
            if (intervalId !== undefined) clearInterval(intervalId);
            reject(new Error(`Phase "${phase.name}" timed out after ${phase.timeoutMs}ms`));
          }
        }, 10);
      });

      try {
        await Promise.race([phase.loader(), timeoutPromise]);
      } catch {
      } finally {
        clearTimeout(timeoutHandle);
        clearInterval(intervalId);
      }

      const duration = Math.round(performance.now() - start);
      const loaded = !timedOut;

      if (timedOut) {
        logger.warn(`Startup phase "${phase.name}" timed out (${phase.timeoutMs}ms)`);
      } else {
        logger.info(`Startup phase "${phase.name}" completed in ${duration}ms`);
      }

      this.completions.push({
        name: phase.name,
        weight: phase.weight,
        loaded,
        durationMs: duration,
        timeoutMs: phase.timeoutMs,
        skipped: false,
        error: timedOut ? `Timed out after ${phase.timeoutMs}ms` : undefined,
      });
    }
  }

  private topologicalSort(phases: InternalPhase[]): InternalPhase[] {
    const nameMap = new Map(phases.map(p => [p.name, p]));
    const visited = new Set<string>();
    const result: InternalPhase[] = [];

    const visit = (name: string, stack: Set<string>): void => {
      if (stack.has(name)) return;
      if (visited.has(name)) return;
      stack.add(name);

      const phase = nameMap.get(name);
      if (phase) {
        for (const dep of phase.dependsOn) {
          visit(dep, stack);
        }
        if (!visited.has(name)) {
          visited.add(name);
          result.push(phase);
        }
      }

      stack.delete(name);
    };

    for (const phase of phases) {
      visit(phase.name, new Set());
    }

    return result;
  }

  isUiReady(): boolean {
    return this.uiReady;
  }

  renderBeforeReady(): void {
    if (typeof process === 'undefined' || !process.stdout) return;
    const critical = this.getCriticalPath();
    const nonCritical = this.getNonCriticalPath();

    process.stdout.write('\n');
    process.stdout.write('  Startup progress:\n');
    for (const p of critical) {
      const done = this.completions.find(c => c.name === p.name);
      const icon = done ? (done.loaded ? '✅' : '❌') : '⏳';
      process.stdout.write(`    ${icon} [CRITICAL] ${p.name}\n`);
    }
    for (const p of nonCritical) {
      const done = this.completions.find(c => c.name === p.name);
      const icon = done ? (done.loaded ? '✅' : '⏳') : '⬜';
      process.stdout.write(`    ${icon} ${p.name}\n`);
    }
    process.stdout.write('\n');
  }

  getCriticalPath(): InternalPhase[] {
    return this.phases.filter(p => p.critical);
  }

  getNonCriticalPath(): InternalPhase[] {
    return this.phases.filter(p => !p.critical);
  }

  getEstimatedTimeRemaining(): number {
    const completed = new Set(this.completions.map(c => c.name));
    const remaining = this.phases.filter(p => !completed.has(p.name));
    if (remaining.length === 0) return 0;

    const completedDurations = this.completions
      .filter(c => c.loaded)
      .map(c => c.durationMs);

    const avgMs = completedDurations.length > 0
      ? completedDurations.reduce((a, b) => a + b, 0) / completedDurations.length
      : 50;

    return Math.round(remaining.length * avgMs);
  }

  getReport(): StartupReport {
    const totalDurationMs = this.completions.reduce((acc, p) => acc + p.durationMs, 0);
    const totalWeight = this.phases.reduce((acc, p) => acc + p.weight, 0);
    const loadedWeight = this.completions
      .filter(p => p.loaded)
      .reduce((acc, p) => acc + p.weight, 0);
    const score = totalWeight > 0 ? Math.round((loadedWeight / totalWeight) * 100) : 0;

    const criticalPhases = this.completions.filter(c => {
      const phase = this.phases.find(p => p.name === c.name);
      return phase?.critical;
    });
    const nonCriticalPhases = this.completions.filter(c => {
      const phase = this.phases.find(p => p.name === c.name);
      return !phase?.critical;
    });

    return {
      totalDurationMs,
      perceivedDurationMs: this.uiReady
        ? criticalPhases.reduce((acc, p) => acc + p.durationMs, 0)
        : totalDurationMs,
      phases: [...this.completions],
      score,
      criticalPathDurationMs: criticalPhases.reduce((acc, p) => acc + p.durationMs, 0),
      nonCriticalPathDurationMs: nonCriticalPhases.reduce((acc, p) => acc + p.durationMs, 0),
      skippedPhases: this.completions.filter(p => p.skipped).map(p => p.name),
      failedPhases: this.completions.filter(p => !p.loaded && !p.skipped).map(p => p.name),
    };
  }
}
