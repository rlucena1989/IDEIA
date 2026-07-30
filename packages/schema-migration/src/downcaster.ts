import { Migration } from './types';
import { createLogger } from '@ideia/logger';
const logger = createLogger('downcaster');

export class Downcaster {
  private _migrations: Migration[] = [];

  registerMigration(m: Migration): void {
    this._migrations.push(m);
    this._migrations.sort((a, b) => a.fromVersion - b.fromVersion);
  }

  async downcast(event: Record<string, unknown>, targetVersion: number): Promise<Record<string, unknown>> {
    let current = { ...event };
    let cv = (event.version as number) || 1;
    const reversed = [...this._migrations].reverse();
    while (cv > targetVersion) {
      const m = reversed.find(r => r.toVersion === cv);
      if (!m) throw new Error(`No downcast path from v${cv}`);
      current = m.migrate(current);
      current.version = m.fromVersion;
      cv = m.fromVersion;
    }
    return current;
  }

  getMigrationCount(): number {
    return this._migrations.length;
  }
}
