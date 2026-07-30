import { createLogger } from '@ideia/logger';
import { Disposable } from '@ideia/core-contributions';

const logger = createLogger('resilience-v2:graceful-shutdown');

export interface ShutdownStage {
  name: string;
  timeout: number;
  action: () => Promise<void>;
}

export interface ShutdownSequence {
  stages: ShutdownStage[];
  totalTimeout: number;
  forceKillAfterTimeout: boolean;
  signalHandlers: NodeJS.Signals[];
}

export interface ShutdownableService {
  name: string;
  shutdown: () => Promise<void>;
  isIdle: () => boolean;
  inflightCount: () => number;
}

export interface ShutdownExecutionReport {
  status: 'completed' | 'partial' | 'failed' | 'timeout';
  completedStages: string[];
  failedStages: Array<{ name: string; error: string }>;
  skippedStages: string[];
  totalDurationMs: number;
  forceKilled: boolean;
}

const DEFAULT_SEQUENCE: Omit<ShutdownSequence, 'stages'> = {
  totalTimeout: 30000,
  forceKillAfterTimeout: true,
  signalHandlers: ['SIGTERM', 'SIGINT'],
};

export class EnhancedGracefulShutdown {
  private services = new Map<string, ShutdownableService>();
  private stages: ShutdownStage[] = [];
  private sequence: ShutdownSequence;
  private shutdownInProgress = false;
  private signalHandlersInstalled = false;

  constructor(sequence?: Partial<ShutdownSequence>) {
    this.sequence = {
      ...DEFAULT_SEQUENCE,
      stages: sequence?.stages || this.createDefaultStages(),
      ...sequence,
    };
    if (!sequence?.stages) {
      this.stages = this.createDefaultStages();
    } else {
      this.stages = sequence.stages;
    }
  }

  registerService(service: ShutdownableService): Disposable {
    this.services.set(service.name, service);
    return { dispose: () => this.services.delete(service.name) };
  }

  registerStage(stage: ShutdownStage): void {
    this.stages.push(stage);
  }

  installSignalHandlers(): void {
    if (this.signalHandlersInstalled) return;
    for (const signal of this.sequence.signalHandlers) {
      process.on(signal, async () => {
        logger.info(`Received ${signal}, starting graceful shutdown...`);
        const report = await this.shutdownAll();
        if (report.status === 'completed') {
          process.exit(0);
        } else {
          process.exit(1);
        }
      });
    }
    this.signalHandlersInstalled = true;
  }

  async shutdownAll(customTimeout?: number): Promise<ShutdownExecutionReport> {
    if (this.shutdownInProgress) {
      return {
        status: 'failed',
        completedStages: [],
        failedStages: [{ name: 'shutdown', error: 'Shutdown already in progress' }],
        skippedStages: [],
        totalDurationMs: 0,
        forceKilled: false,
      };
    }

    this.shutdownInProgress = true;
    const startTime = Date.now();
    const totalTimeout = customTimeout || this.sequence.totalTimeout;
    const completedStages: string[] = [];
    const failedStages: Array<{ name: string; error: string }> = [];
    const skippedStages: string[] = [];

    for (const stage of this.stages) {
      const elapsed = Date.now() - startTime;
      if (elapsed >= totalTimeout) {
        skippedStages.push(stage.name);
        continue;
      }

      const stageTimeout = Math.min(stage.timeout, totalTimeout - elapsed);
      try {
        await this.executeStageWithTimeout(stage, stageTimeout);
        completedStages.push(stage.name);
      } catch (e) {
        failedStages.push({ name: stage.name, error: (e as Error).message });
        logger.error(`Stage "${stage.name}" failed`, { error: (e as Error).message });
      }
    }

    const totalDurationMs = Date.now() - startTime;
    const forceKilled = totalDurationMs >= totalTimeout && this.sequence.forceKillAfterTimeout;

    let status: ShutdownExecutionReport['status'];
    if (failedStages.length === 0 && skippedStages.length === 0) {
      status = 'completed';
    } else if (forceKilled) {
      status = 'timeout';
    } else if (completedStages.length > 0) {
      status = 'partial';
    } else {
      status = 'failed';
    }

    this.shutdownInProgress = false;

    logger.info(`Shutdown ${status}`, {
      completedStages: completedStages.length,
      failedStages: failedStages.length,
      durationMs: totalDurationMs,
      forceKilled,
    });

    return { status, completedStages, failedStages, skippedStages, totalDurationMs, forceKilled };
  }

  private async executeStageWithTimeout(stage: ShutdownStage, timeout: number): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error(`Stage "${stage.name}" timed out after ${timeout}ms`)), timeout);
      stage.action().then(() => { clearTimeout(timer); resolve(); }).catch(err => { clearTimeout(timer); reject(err); });
    });
  }

  private createDefaultStages(): ShutdownStage[] {
    return [
      { name: 'unregister-health', timeout: 1000, action: async () => { /* placeholder */ } },
      { name: 'stop-accepting', timeout: 1000, action: async () => { /* placeholder */ } },
      { name: 'drain-connections', timeout: 5000, action: async () => { await this.drainServices(); } },
      { name: 'complete-inflight', timeout: 10000, action: async () => { await this.completeInflight(); } },
      { name: 'flush-buffers', timeout: 3000, action: async () => { /* placeholder */ } },
      { name: 'persist-state', timeout: 5000, action: async () => { await this.persistState(); } },
      { name: 'close-resources', timeout: 3000, action: async () => { await this.shutdownServices(); } },
      { name: 'close-file-handles', timeout: 2000, action: async () => { /* placeholder */ } },
      { name: 'finalize', timeout: 1000, action: async () => { logger.info('Shutdown sequence finalized'); } },
    ];
  }

  private async drainServices(): Promise<void> {
    const draining = Array.from(this.services.values())
      .filter(s => !s.isIdle())
      .map(s => s.shutdown());
    if (draining.length > 0) {
      await Promise.allSettled(draining);
    }
  }

  private async completeInflight(): Promise<void> {
    const inflightServices = Array.from(this.services.values())
      .filter(s => s.inflightCount() > 0);

    if (inflightServices.length === 0) return;

    const maxWait = setTimeout(() => {
      logger.warn('Inflight requests did not complete in time', {
        services: inflightServices.map(s => `${s.name}(${s.inflightCount()})`),
      });
    }, 8000);

    for (const service of inflightServices) {
      while (service.inflightCount() > 0) {
        await new Promise(r => setTimeout(r, 100));
      }
    }
    clearTimeout(maxWait);
  }

  private async persistState(): Promise<void> {
    const persistPromises = Array.from(this.services.values()).map(s => s.shutdown());
    await Promise.allSettled(persistPromises);
  }

  private async shutdownServices(): Promise<void> {
    const shutdownPromises = Array.from(this.services.entries()).map(([name, service]) =>
      service.shutdown().catch(err => {
        logger.error(`Service "${name}" shutdown failed`, { error: String(err) });
      })
    );
    await Promise.allSettled(shutdownPromises);
  }

  getStatus(): { registeredServices: number; shutdownInProgress: boolean; signalHandlersInstalled: boolean } {
    return {
      registeredServices: this.services.size,
      shutdownInProgress: this.shutdownInProgress,
      signalHandlersInstalled: this.signalHandlersInstalled,
    };
  }
}

export function createEnhancedGracefulShutdown(sequence?: Partial<ShutdownSequence>): EnhancedGracefulShutdown {
  return new EnhancedGracefulShutdown(sequence);
}
