import { EvolutionCycle } from './evolution-cycle';
import { MetricsScanner } from './metrics-scanner';
import { ScannerPool } from './scanner-pool';
import { AnalyzerEngine } from './analyzer-engine';
import { PlannerEngine } from './planner-engine';
import { ExecutorEngine } from './executor-engine';
import { RollbackManager } from './rollback-manager';

export interface EvolutionDaemonConfig {
  intervalMs?: number;
  autoCommit?: boolean;
  maxChangesPerCycle?: number;
  rollbackOnFailure?: boolean;
}

export interface EvolutionCycleReport {
  cycleId: string;
  success: boolean;
  duration: number;
  stepsExecuted: number;
  stepsFailed: number;
  adrGenerated: number;
  scanResults: Array<{ scanner: string; score: number; findings: string[] }>;
  errors: string[];
}

export class EvolutionDaemon {
  private cycle: EvolutionCycle;
  private intervalId?: ReturnType<typeof setInterval>;
  private config: EvolutionDaemonConfig;

  constructor(config: EvolutionDaemonConfig = {}) {
    this.config = {
      intervalMs: 60000,
      autoCommit: false,
      maxChangesPerCycle: 5,
      rollbackOnFailure: true,
      ...config,
    };
    const scannerPool = new (ScannerPool as any)();
    const analyzer = new (AnalyzerEngine as any)();
    const planner = new (PlannerEngine as any)();
    const executor = new (ExecutorEngine as any)();
    const rollbackManager = new (RollbackManager as any)();
    this.cycle = new (EvolutionCycle as any)(scannerPool, analyzer, planner, executor, rollbackManager) as EvolutionCycle;
  }

  start(): void {
    this.intervalId = setInterval(() => {
      this.cycle.run().catch(() => { /* cycle error handled internally */ });
    }, this.config.intervalMs);
  }

  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = undefined;
    }
  }

  async runOnce(): Promise<EvolutionCycleReport> {
    const start = Date.now();
    try {
      await this.cycle.run();
      return {
        cycleId: `cycle-${Date.now()}`,
        success: true,
        duration: Date.now() - start,
        stepsExecuted: 1,
        stepsFailed: 0,
        adrGenerated: 0,
        scanResults: [],
        errors: [],
      };
    } catch (err) {
      return {
        cycleId: `cycle-${Date.now()}`,
        success: false,
        duration: Date.now() - start,
        stepsExecuted: 0,
        stepsFailed: 1,
        adrGenerated: 0,
        scanResults: [],
        errors: [String(err)],
      };
    }
  }
}

export function createEvolutionDaemon(config?: EvolutionDaemonConfig): EvolutionDaemon {
  return new EvolutionDaemon(config);
}
