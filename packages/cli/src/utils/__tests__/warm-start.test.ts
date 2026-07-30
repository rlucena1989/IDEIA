jest.mock('../output', () => ({
  printLine: jest.fn(),
}));

jest.mock('../../io', () => ({
  getIO: jest.fn(),
}));

import path from 'path';
import os from 'os';

describe('WarmStartCache', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = path.join(os.tmpdir(), `warm-test-${Date.now()}-${Math.random()}`);
  });

  afterEach(() => {
    const { WarmStartCache } = require('../warm-start');
    const cleaner = new WarmStartCache(tmpDir);
    cleaner.clear();
  });

  describe('get/set', () => {
    it('should store and retrieve a value', () => {
      const { WarmStartCache } = require('../warm-start');
      const cache = new WarmStartCache(tmpDir);
      cache.set('key1', { hello: 'world' });
      const result = cache.get('key1');
      expect(result).toEqual({ hello: 'world' });
    });

    it('should return null for missing key', () => {
      const { WarmStartCache } = require('../warm-start');
      const cache = new WarmStartCache(tmpDir);
      expect(cache.get('nonexistent')).toBeNull();
    });

    it('should overwrite existing key', () => {
      const { WarmStartCache } = require('../warm-start');
      const cache = new WarmStartCache(tmpDir);
      cache.set('k', 'v1');
      cache.set('k', 'v2');
      expect(cache.get('k')).toBe('v2');
    });
  });

  describe('invalidate', () => {
    it('should remove a key from cache', () => {
      const { WarmStartCache } = require('../warm-start');
      const cache = new WarmStartCache(tmpDir);
      cache.set('k', 'v');
      cache.invalidate('k');
      expect(cache.get('k')).toBeNull();
    });
  });

  describe('clear', () => {
    it('should remove all entries', () => {
      const { WarmStartCache } = require('../warm-start');
      const cache = new WarmStartCache(tmpDir);
      cache.set('a', 1);
      cache.set('b', 2);
      cache.clear();
      expect(cache.get('a')).toBeNull();
      expect(cache.get('b')).toBeNull();
    });
  });

  describe('stats', () => {
    it('should return zero for empty cache', () => {
      const { WarmStartCache } = require('../warm-start');
      const cache = new WarmStartCache(tmpDir);
      const s = cache.stats();
      expect(s.entries).toBe(0);
      expect(s.sizeEstimateKb).toBe(0);
    });

    it('should reflect stored entries', () => {
      const { WarmStartCache } = require('../warm-start');
      const cache = new WarmStartCache(tmpDir);
      cache.set('a', 1);
      cache.set('b', 2);
      const s = cache.stats();
      expect(s.entries).toBe(2);
    });
  });

  describe('TTL expiry', () => {
    it('should expire entries after TTL', async () => {
      const { WarmStartCache } = require('../warm-start');
      const cache = new WarmStartCache(tmpDir);
      cache.set('k', 'v', 1);
      expect(cache.get('k')).toBe('v');
      await new Promise(r => setTimeout(r, 10));
      const cache2 = new WarmStartCache(tmpDir);
      expect(cache2.get('k')).toBeNull();
    });
  });

  describe('persistence across instances', () => {
    it('should persist data to disk', () => {
      const { WarmStartCache } = require('../warm-start');
      const cache1 = new WarmStartCache(tmpDir);
      cache1.set('persist', 'data');
      const cache2 = new WarmStartCache(tmpDir);
      expect(cache2.get('persist')).toBe('data');
    });
  });
});

describe('withCache', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = path.join(os.tmpdir(), `withcache-test-${Date.now()}-${Math.random()}`);
  });

  afterEach(() => {
    const { WarmStartCache } = require('../warm-start');
    new WarmStartCache(tmpDir).clear();
  });

  it('should compute and cache value', () => {
    const { withCache } = require('../warm-start');
    const fn = jest.fn().mockReturnValue(42);
    const r1 = withCache('compute-key', fn, 300000, tmpDir);
    expect(r1).toBe(42);
    expect(fn).toHaveBeenCalledTimes(1);
    const r2 = withCache('compute-key', fn, 300000, tmpDir);
    expect(r2).toBe(42);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('should call fn again after TTL expiry', async () => {
    const { withCache } = require('../warm-start');
    const fn = jest.fn().mockReturnValue('fresh');
    withCache('ttl-key', fn, 1, tmpDir);
    expect(fn).toHaveBeenCalledTimes(1);
    await new Promise(r => setTimeout(r, 10));
    withCache('ttl-key', fn, 1, tmpDir);
    expect(fn).toHaveBeenCalledTimes(2);
  });
});

describe('cacheCommand', () => {
  it('should return a Commander command', () => {
    const { cacheCommand } = require('../warm-start');
    const cmd = cacheCommand();
    expect(cmd.name()).toBe('cache');
  });
});

describe('prewarmCommonCommands', () => {
  it('should execute without throwing', () => {
    const { prewarmCommonCommands } = require('../warm-start');
    expect(() => prewarmCommonCommands()).not.toThrow();
  });
});
