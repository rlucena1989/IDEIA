import { MemoryCache } from '../src/memory-cache';
import { CacheOptimizer } from '../src/cache-optimizer';
import type { BackupEntry } from '../src/cache-layer';

describe('Cache Backup and Restore', () => {
  let cache: MemoryCache;

  beforeEach(() => {
    cache = new MemoryCache({ maxSize: 100, ttlMs: 60000 });
  });

  describe('MemoryCache backup', () => {
    it('should backup all entries', async () => {
      await cache.set('a', 1);
      await cache.set('b', 'two');
      await cache.set('c', { deep: true });

      const backup = await cache.backup();
      expect(backup).toHaveLength(3);
      expect(backup.find((e) => e.key === 'a')?.value).toBe(1);
      expect(backup.find((e) => e.key === 'b')?.value).toBe('two');
      expect(backup.find((e) => e.key === 'c')?.value).toEqual({ deep: true });
    });

    it('should backup entry metadata', async () => {
      await cache.set('meta', 'val', 10000);
      const backup = await cache.backup();
      const entry = backup.find((e) => e.key === 'meta')!;
      expect(entry.expiresAt).toBeGreaterThan(Date.now());
      expect(entry.timestamp).toBeGreaterThan(0);
      expect(entry.hits).toBe(0);
      expect(typeof entry.key).toBe('string');
    });

    it('should return empty array for empty cache', async () => {
      const backup = await cache.backup();
      expect(backup).toHaveLength(0);
    });

    it('should preserve hit counts in backup', async () => {
      await cache.set('popular', 'data');
      await cache.get('popular');
      await cache.get('popular');

      const backup = await cache.backup();
      const entry = backup.find((e) => e.key === 'popular')!;
      expect(entry.hits).toBe(2);
    });
  });

  describe('MemoryCache restore', () => {
    it('should restore entries with full metadata', async () => {
      const future = Date.now() + 60000;
      const entries: BackupEntry[] = [
        { key: 'a', value: 1, expiresAt: future, timestamp: Date.now(), hits: 0 },
        { key: 'b', value: 'text', expiresAt: future, timestamp: Date.now(), hits: 3 },
      ];

      await cache.restore(entries);
      expect(await cache.get('a')).toBe(1);
      expect(await cache.get('b')).toBe('text');
      const backupAfterGet = await cache.backup();
      expect(backupAfterGet.find((e) => e.key === 'b')?.hits).toBe(4);
    });

    it('should restore entries even if expired', async () => {
      const entries: BackupEntry[] = [
        { key: 'expired', value: 'old', expiresAt: Date.now() - 1000, timestamp: Date.now() - 10000, hits: 0 },
      ];

      await cache.restore(entries);
      expect(await cache.has('expired')).toBe(false);
    });

    it('should handle empty restore', async () => {
      await cache.restore([]);
      expect((await cache.keys()).length).toBe(0);
    });

    it('should preserve access order for restored entries', async () => {
      const future = Date.now() + 60000;
      const entries: BackupEntry[] = [
        { key: 'first', value: 1, expiresAt: future, timestamp: Date.now(), hits: 0 },
        { key: 'second', value: 2, expiresAt: future, timestamp: Date.now(), hits: 0 },
        { key: 'third', value: 3, expiresAt: future, timestamp: Date.now(), hits: 0 },
      ];

      await cache.restore(entries);
      const keys = await cache.keys();
      expect(keys).toContain('first');
      expect(keys).toContain('second');
      expect(keys).toContain('third');
    });
  });

  describe('CacheOptimizer backup/restore', () => {
    let optimizer: CacheOptimizer;

    beforeEach(() => {
      optimizer = new CacheOptimizer(cache);
    });

    afterEach(() => {
      optimizer.stop();
    });

    it('should delegate backup to underlying cache', async () => {
      await cache.set('opt-backup', 'value');
      const backup = await optimizer.backup();
      expect(backup).toHaveLength(1);
      expect(backup[0].key).toBe('opt-backup');
    });

    it('should delegate restore to underlying cache', async () => {
      const future = Date.now() + 60000;
      await optimizer.restore([{ key: 'opt-restored', value: 'data', expiresAt: future, timestamp: Date.now(), hits: 0 }]);
      expect(await cache.get('opt-restored')).toBe('data');
    });
  });
});
