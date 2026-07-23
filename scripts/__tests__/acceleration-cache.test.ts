import { JsonCache } from '../acceleration/cache';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

describe('acceleration - cache', () => {
  let tmpFile: string;

  beforeEach(() => {
    tmpFile = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'cache-')), 'cache.json');
  });

  afterEach(() => {
    try { fs.rmSync(path.dirname(tmpFile), { recursive: true, force: true }); } catch {}
  });

  it('deve criar cache vazio', () => {
    const cache = new JsonCache(tmpFile);
    expect(cache.get('nonexistent')).toBeUndefined();
  });

  it('deve armazenar e recuperar valor', () => {
    const cache = new JsonCache(tmpFile);
    cache.set('key1', { hello: 'world' });
    const val = cache.get<any>('key1');
    expect(val).toEqual({ hello: 'world' });
  });

  it('deve expirar apos TTL', async () => {
    const cache = new JsonCache(tmpFile);
    cache.set('key2', 'value', 10); // 10ms TTL
    await new Promise(r => setTimeout(r, 20));
    expect(cache.get('key2')).toBeUndefined();
  });

  it('deve sobrescrever chave existente', () => {
    const cache = new JsonCache(tmpFile);
    cache.set('k', 'v1');
    cache.set('k', 'v2');
    expect(cache.get('k')).toBe('v2');
  });

  it('deve persistir em disco e recarregar', () => {
    const cache1 = new JsonCache(tmpFile);
    cache1.set('persist', 'saved');
    // Reload from same file
    const cache2 = new JsonCache(tmpFile);
    expect(cache2.get('persist')).toBe('saved');
  });

  it('cleanup deve remover entradas expiradas', async () => {
    const cache = new JsonCache(tmpFile);
    cache.set('fresh', 'value', 10000);
    cache.set('stale', 'value', 10);
    await new Promise(r => setTimeout(r, 20));
    cache.cleanup();
    expect(cache.get('fresh')).toBe('value');
    expect(cache.get('stale')).toBeUndefined();
  });
});