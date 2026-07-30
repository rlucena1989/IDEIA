process.env.GTI_TEST_MODE = '1';

import { createStorage, StorageType } from '../src/storage/storage-index';
import { InMemoryStorage, LocalFileSystemStorage } from '../src/storage/storage-provider';
import { resetIO, getIO } from '../src/io';

beforeEach(() => {
  resetIO();
});

describe('createStorage', () => {
  it('should create InMemoryStorage when type is memory', () => {
    const storage = createStorage('memory');
    expect(storage).toBeInstanceOf(InMemoryStorage);
  });

  it('should create LocalFileSystemStorage when type is filesystem', () => {
    const storage = createStorage('filesystem');
    expect(storage).toBeInstanceOf(LocalFileSystemStorage);
  });

  it('should default to filesystem when no type given', () => {
    const storage = createStorage();
    expect(storage).toBeInstanceOf(LocalFileSystemStorage);
  });

  it('should fallback to memory for unknown type', () => {
    const storage = createStorage('unknown' as StorageType);
    expect(storage).toBeInstanceOf(InMemoryStorage);
  });

  it('should pass config to filesystem storage', () => {
    const storage = createStorage('filesystem', { basePath: '/tmp/test-store', defaultTtl: 5000 });
    expect(storage).toBeInstanceOf(LocalFileSystemStorage);
  });
});

describe('InMemoryStorage', () => {
  let storage: InMemoryStorage;

  beforeEach(() => {
    storage = new InMemoryStorage();
  });

  it('should set and get a value', async () => {
    await storage.set('key1', { hello: 'world' });
    const entry = await storage.get('key1');
    expect(entry).toBeDefined();
    expect(entry!.value).toEqual({ hello: 'world' });
    expect(entry!.key).toBe('key1');
    expect(entry!.timestamp).toBeGreaterThan(0);
  });

  it('should return undefined for missing key', async () => {
    const entry = await storage.get('nonexistent');
    expect(entry).toBeUndefined();
  });

  it('should delete a key', async () => {
    await storage.set('key2', 42);
    expect(await storage.delete('key2')).toBe(true);
    expect(await storage.get('key2')).toBeUndefined();
  });

  it('should return false when deleting nonexistent key', async () => {
    expect(await storage.delete('nonexistent')).toBe(false);
  });

  it('should list entries by prefix', async () => {
    await storage.set('app:name', 'test');
    await storage.set('app:version', '1.0');
    await storage.set('user:name', 'dev');
    const result = await storage.list('app:');
    expect(result).toHaveLength(2);
  });

  it('should return empty list when prefix has no matches', async () => {
    await storage.set('a:1', 1);
    const result = await storage.list('b:');
    expect(result).toHaveLength(0);
  });

  it('should clear all entries', async () => {
    await storage.set('k1', 1);
    await storage.set('k2', 2);
    await storage.clear();
    expect(await storage.get('k1')).toBeUndefined();
    expect(await storage.get('k2')).toBeUndefined();
  });

  it('should expire entries based on ttl', async () => {
    jest.useFakeTimers();
    await storage.set('temp', 'value', 100);
    const beforeExpiry = await storage.get('temp');
    expect(beforeExpiry).toBeDefined();
    jest.advanceTimersByTime(150);
    const afterExpiry = await storage.get('temp');
    expect(afterExpiry).toBeUndefined();
    jest.useRealTimers();
  });

  it('should overwrite existing key', async () => {
    await storage.set('key', 'first');
    await storage.set('key', 'second');
    const entry = await storage.get('key');
    expect(entry!.value).toBe('second');
  });

  it('should store different types of values', async () => {
    await storage.set('str', 'text');
    await storage.set('num', 123);
    await storage.set('bool', false);
    await storage.set('arr', [1, 2, 3]);
    await storage.set('obj', { nested: true });
    expect((await storage.get('str'))!.value).toBe('text');
    expect((await storage.get('num'))!.value).toBe(123);
    expect((await storage.get('bool'))!.value).toBe(false);
    expect((await storage.get('arr'))!.value).toEqual([1, 2, 3]);
    expect((await storage.get('obj'))!.value).toEqual({ nested: true });
  });
});

describe('LocalFileSystemStorage', () => {
  let storage: LocalFileSystemStorage;

  beforeEach(() => {
    resetIO();
    storage = new LocalFileSystemStorage({ basePath: '/tmp/test-store' });
  });

  it('should set and get a value', async () => {
    await storage.set('key1', { hello: 'world' });
    const entry = await storage.get('key1');
    expect(entry).toBeDefined();
    expect(entry!.value).toEqual({ hello: 'world' });
  });

  it('should return undefined for missing key', async () => {
    const entry = await storage.get('nonexistent');
    expect(entry).toBeUndefined();
  });

  it('should delete a key', async () => {
    await storage.set('delete-me', 'value');
    expect(await storage.delete('delete-me')).toBe(true);
    expect(await storage.get('delete-me')).toBeUndefined();
  });

  it('should return false when deleting nonexistent key', async () => {
    expect(await storage.delete('ghost')).toBe(false);
  });

  it('should list entries by prefix', async () => {
    await storage.set('cfg:host', 'localhost');
    await storage.set('cfg:port', '8080');
    await storage.set('other:x', 'y');
    const result = await storage.list('cfg:');
    expect(result).toHaveLength(2);
    const keys = result.map(e => e.key);
    expect(keys).toContain('cfg:host');
    expect(keys).toContain('cfg:port');
  });

  it('should clear base path without throwing', async () => {
    await storage.set('k1', 1);
    await storage.set('k2', 2);
    await expect(storage.clear()).resolves.toBeUndefined();
    expect(getIO().fs.exists('/tmp/test-store')).toBe(true);
  });

  it('should handle nonexistent base dir on list', async () => {
    const fresh = new LocalFileSystemStorage({ basePath: '/tmp/empty-store' });
    const result = await fresh.list('x');
    expect(result).toHaveLength(0);
  });

  it('should expire entries based on ttl', async () => {
    const originalDateNow = Date.now;
    const now = 1000000;
    Date.now = jest.fn(() => now);

    await storage.set('temp', 'expirable', 100);

    Date.now = jest.fn(() => now + 50);
    let entry = await storage.get('temp');
    expect(entry).toBeDefined();

    Date.now = jest.fn(() => now + 200);
    entry = await storage.get('temp');
    expect(entry).toBeUndefined();

    Date.now = originalDateNow;
  });

  it('should sanitize key names for filesystem', async () => {
    await storage.set('path/to/key', 'value');
    const entry = await storage.get('path/to/key');
    expect(entry!.value).toBe('value');
  });

  it('should handle concurrent set and get', async () => {
    await Promise.all([
      storage.set('a', 1),
      storage.set('b', 2),
      storage.set('c', 3),
    ]);
    const all = await storage.list('');
    expect(all).toHaveLength(3);
  });
});

describe('barrel exports', () => {
  it('should export createStorage', () => {
    const barrel = require('../src/storage/storage-index');
    expect(barrel.createStorage).toBeDefined();
  });

  it('should export runtime constructors and factory', () => {
    const barrel = require('../src/storage/storage-index');
    expect(barrel.createStorage).toBeDefined();
    expect(barrel.LocalFileSystemStorage).toBeDefined();
    expect(barrel.InMemoryStorage).toBeDefined();
    expect(barrel.createStorage('memory')).toBeInstanceOf(barrel.InMemoryStorage);
  });
});
