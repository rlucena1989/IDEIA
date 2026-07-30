import { MigrationPlan, MigrationPhase } from './types';
import { createLogger } from '@ideia/logger';
import { SchemaRegistry } from './schema-registry';
import { Upcaster } from './upcaster';
const logger = createLogger('zero-downtime-migrator');

export class ZeroDowntimeMigrator {
  private _plan: MigrationPlan | null = null;
  private _aborted = false;

  constructor(
    private _upcaster: Upcaster,
    private _registry: SchemaRegistry
  ) {}

  async planMigration(type: string, from: number, to: number): Promise<MigrationPlan> {
    const phases: MigrationPhase[] = [
      { name: 'double-write', status: 'pending' },
      { name: 'backfill', status: 'pending' },
      { name: 'switch', status: 'pending' },
      { name: 'retire', status: 'pending' },
    ];
    this._plan = {
      type, fromVersion: from, toVersion: to,
      compatibility: 'BACKWARD', phases,
      estimatedDuration: '48h',
    };
    return this._plan;
  }

  async executePhase(idx: number): Promise<void> {
    if (!this._plan || this._aborted) return;
    const phase = this._plan.phases[idx];
    if (!phase) throw new Error(`Invalid phase ${idx}`);
    phase.status = 'active';
    phase.startedAt = Date.now();
    try {
      switch (phase.name) {
        case 'double-write':
          break;
        case 'backfill':
          break;
        case 'switch':
          break;
        case 'retire':
          this._registry.deprecate(this._plan.type, this._plan.fromVersion);
          break;
      }
      phase.status = 'completed';
    } catch {
      phase.status = 'rolled_back';
      throw new Error(`Phase ${phase.name} failed`);
    }
    phase.completedAt = Date.now();
  }

  async executeFull(type: string, from: number, to: number): Promise<void> {
    this._plan = await this.planMigration(type, from, to);
    for (let i = 0; i < this._plan.phases.length; i++) {
      if (this._aborted) return;
      await this.executePhase(i);
    }
  }

  abort(): void {
    this._aborted = true;
  }

  getPlan(): MigrationPlan | null {
    return this._plan;
  }

  isAborted(): boolean {
    return this._aborted;
  }
}
