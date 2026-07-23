import { Emitter, Disposable } from '@ideia/core-contributions';
import { PreferenceMigration, PreferenceMigrationManager } from './types';

export class DefaultPreferenceMigrationManager implements PreferenceMigrationManager {
  private migrations: PreferenceMigration[] = [];

  register(migration: PreferenceMigration): Disposable {
    this.migrations.push(migration);
    this.migrations.sort((a, b) => a.fromVersion - b.fromVersion);
    return { dispose: () => this.unregister(migration) };
  }

  migrate(fromVersion: number, toVersion: number, data: Record<string, unknown>): Record<string, unknown> {
    let current = fromVersion;
    let result = { ...data };

    while (current < toVersion) {
      const migration = this.migrations.find(m => m.fromVersion === current);
      if (!migration) {
        console.warn(`No migration found from version ${current} to ${current + 1}`);
        current++;
        continue;
      }
      result = migration.migrate(result);
      current = migration.toVersion;
    }

    return result;
  }

  getCurrentVersion(): number {
    if (this.migrations.length === 0) return 0;
    return this.migrations[this.migrations.length - 1].toVersion;
  }

  private unregister(migration: PreferenceMigration): void {
    this.migrations = this.migrations.filter(m => m !== migration);
  }
}
