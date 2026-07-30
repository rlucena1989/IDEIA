import { InMemoryStorage } from '../storage-provider';

describe('InMemoryStorage', () => {
  let storage: InMemoryStorage;

  beforeEach(() => {
    storage = new InMemoryStorage();
  });

  it('should store and retrieve a value', async () => {
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
    await storage.set('key2', 'value2');
    const deleted = await storage.delete('key2');
    expect(deleted).toBe(true);
    const entry = await storage.get('key2');
    expect(entry).toBeUndefined();
  });

  it('should list keys by prefix', async () => {
    await storage.set('test:foo', 1);
    await storage.set('test:bar', 2);
    await storage.set('other:baz', 3);
    const entries = await storage.list('test:');
    expect(entries).toHaveLength(2);
  });

  it('should clear all entries', async () => {
    await storage.set('a', 1);
    await storage.set('b', 2);
    await storage.clear();
    const entries = await storage.list('');
    expect(entries).toHaveLength(0);
  });

  it('should respect ttl', async () => {
    await storage.set('temp', 'value', 1);
    await storage.get('temp');
    const entry = await storage.get('temp');
    expect(entry).toBeDefined();
  });
});
