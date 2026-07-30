import { Migration } from './types';
import { createLogger } from '@ideia/logger';
import { SchemaRegistry } from './schema-registry';
const logger = createLogger('upcaster');

export class Upcaster {
  private _migrations: Migration[] = [];

  constructor(private _registry: SchemaRegistry) {}

  registerMigration(m: Migration): void {
    this._migrations.push(m);
    this._migrations.sort((a, b) => a.fromVersion - b.fromVersion);
  }

  async upcast(event: Record<string, unknown>, targetVersion: number): Promise<Record<string, unknown>> {
    let current = { ...event };
    let cv = (event.version as number) || 1;
    const path = this._findPath(cv, targetVersion);
    if (!path) throw new Error(`No migration path v${cv} to v${targetVersion}`);
    for (const m of path) {
      current = m.migrate(current);
      current.version = m.toVersion;
      cv = m.toVersion;
    }
    return current;
  }

  async batchUpcast(events: Record<string, unknown>[], targetVersion: number): Promise<Record<string, unknown>[]> {
    const results: Record<string, unknown>[] = [];
    let errors = 0;
    for (const e of events) {
      try {
        results.push(await this.upcast(e, targetVersion));
      } catch {
        errors++;
        results.push(e);
      }
    }
    if (errors > 0) {
      logger.warn(`Batch upcast: ${errors}/${events.length} failed`);
    }
    return results;
  }

  async verifyChain(from: number, to: number): Promise<{ valid: boolean; steps: string[]; errors: string[] }> {
    const steps: string[] = [];
    const errors: string[] = [];
    let cur = from;
    while (cur < to) {
      const m = this._migrations.find(x => x.fromVersion === cur);
      if (!m) {
        errors.push(`No migration from v${cur}`);
        break;
      }
      steps.push(m.description || `v${m.fromVersion}->v${m.toVersion}`);
      cur = m.toVersion;
    }
    return { valid: errors.length === 0 && cur === to, steps, errors };
  }

  getMigrationCount(): number {
    return this._migrations.length;
  }

  private _findPath(from: number, to: number): Migration[] | null {
    if (from >= to) return [];
    const path: Migration[] = [];
    let cur = from;
    while (cur < to) {
      const m = this._migrations.find(x => x.fromVersion === cur && x.toVersion <= to);
      if (!m) return null;
      path.push(m);
      cur = m.toVersion;
    }
    return path;
  }
}
