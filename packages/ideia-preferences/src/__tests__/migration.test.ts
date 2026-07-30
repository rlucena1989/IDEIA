import { DefaultPreferenceMigrationManager } from '../migration';
import { PreferenceMigration } from '../types';

describe('DefaultPreferenceMigrationManager', () => {
  let manager: DefaultPreferenceMigrationManager;

  beforeEach(() => {
    manager = new DefaultPreferenceMigrationManager();
  });

  describe('register', () => {
    it('registers a migration and sorts by fromVersion', () => {
      const m1: PreferenceMigration = { fromVersion: 1, toVersion: 2, migrate: d => d };
      const m2: PreferenceMigration = { fromVersion: 0, toVersion: 1, migrate: d => d };
      manager.register(m1);
      manager.register(m2);
      expect(manager.getCurrentVersion()).toBe(2);
    });

    it('returns a disposable that unregisters the migration', () => {
      const m: PreferenceMigration = { fromVersion: 0, toVersion: 1, migrate: d => d };
      const disposable = manager.register(m);
      expect(manager.getCurrentVersion()).toBe(1);
      disposable.dispose();
      expect(manager.getCurrentVersion()).toBe(0);
    });
  });

  describe('migrate', () => {
    it('returns data unchanged with no migrations registered', () => {
      const data = { key: 'value' };
      const result = manager.migrate(0, 1, data);
      expect(result).toEqual(data);
    });

    it('applies a single migration transform', () => {
      const m: PreferenceMigration = {
        fromVersion: 0,
        toVersion: 1,
        migrate: data => ({ ...data, migrated: true }),
      };
      manager.register(m);
      const result = manager.migrate(0, 1, { key: 'value' });
      expect(result).toEqual({ key: 'value', migrated: true });
    });

    it('applies multiple migrations in sequence', () => {
      const m1: PreferenceMigration = { fromVersion: 0, toVersion: 1, migrate: d => ({ ...d, v1: true }) };
      const m2: PreferenceMigration = { fromVersion: 1, toVersion: 2, migrate: d => ({ ...d, v2: true }) };
      const m3: PreferenceMigration = { fromVersion: 2, toVersion: 3, migrate: d => ({ ...d, v3: true }) };
      manager.register(m1);
      manager.register(m2);
      manager.register(m3);
      const result = manager.migrate(0, 3, {});
      expect(result).toEqual({ v1: true, v2: true, v3: true });
    });

    it('skips missing migration steps with a warning', () => {
      const m1: PreferenceMigration = { fromVersion: 0, toVersion: 1, migrate: d => ({ ...d, v1: true }) };
      const m3: PreferenceMigration = { fromVersion: 2, toVersion: 3, migrate: d => ({ ...d, v3: true }) };
      manager.register(m1);
      manager.register(m3);
      const result = manager.migrate(0, 3, {});
      expect(result).toEqual({ v1: true, v3: true });
    });

    it('transforms data content during migration', () => {
      const m: PreferenceMigration = {
        fromVersion: 0,
        toVersion: 1,
        migrate: data => {
          const { oldKey, ...rest } = data;
          return { ...rest, newKey: oldKey };
        },
      };
      manager.register(m);
      const result = manager.migrate(0, 1, { oldKey: 'value' });
      expect(result).toEqual({ newKey: 'value' });
      expect((result as Record<string, unknown>).oldKey).toBeUndefined();
    });
  });

  describe('getCurrentVersion', () => {
    it('returns 0 when no migrations registered', () => {
      expect(manager.getCurrentVersion()).toBe(0);
    });

    it('returns the toVersion of the last migration', () => {
      manager.register({ fromVersion: 0, toVersion: 1, migrate: d => d });
      manager.register({ fromVersion: 1, toVersion: 3, migrate: d => d });
      expect(manager.getCurrentVersion()).toBe(3);
    });
  });
});
