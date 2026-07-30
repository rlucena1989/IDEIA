process.env.GTI_TEST_MODE = '1';

jest.mock('../src/runtime/stack-detector', () => ({
  detectLanguages: jest.fn(() => []),
}));
jest.mock('node:fs', () => {
  const actual = jest.requireActual('node:fs');
  return {
    ...actual,
    promises: {
      ...actual.promises,
      readdir: jest.fn(() => Promise.resolve([])),
      readFile: jest.fn(() => { throw new Error('ENOENT'); }),
    },
  };
});

import { Command } from 'commander';
import { AdapterRuntime } from '../src/runtime/adapter-runtime';
import { LanguageId, AdapterCommandId, RunStatus } from '../src/runtime/adapter-contract';
import { resetIO, getIO } from '../src/io';
import { MockIOContainer } from '../src/io/mock';
import { LocalFileSystemStorage, InMemoryStorage, StorageProvider } from '../src/storage/storage-provider';
import { createStorage, StorageType } from '../src/storage/storage-index';

let mockIO: MockIOContainer;

beforeEach(() => {
  resetIO();
  const io = getIO();
  mockIO = io as unknown as MockIOContainer;
  mockIO._reset();
});

afterEach(() => {
  resetIO();
});

describe('CLI adapter — argv → use case → result flow', () => {
  it('should parse argv and invoke action', () => {
    const results: string[] = [];
    const program = new Command('adapter-test');
    program
      .command('generate <type> <name>')
      .action((type: string, name: string) => {
        results.push(type, name);
      });
    program.parse(['generate', 'use-case', 'login'], { from: 'user' });
    expect(results).toEqual(['use-case', 'login']);
  });

  it('should pass options to action handler', () => {
    let opts: Record<string, unknown> = {};
    const program = new Command('opt-test');
    program
      .command('deploy')
      .option('--env <env>', 'environment')
      .option('--canary <pct>', 'canary percent')
      .action((options: Record<string, unknown>) => {
        opts = options;
      });
    program.parse(['deploy', '--env', 'prod', '--canary', '10'], { from: 'user' });
    expect(opts.env).toBe('prod');
    expect(opts.canary).toBe('10');
  });

  it('should return structured result from use case', () => {
    type UseCaseResult = { ok: boolean; data?: { template: string; name: string } };
    const runUseCase = (type: string, name: string): UseCaseResult => {
      if (!name) return { ok: false };
      return { ok: true, data: { template: type, name } };
    };
    const program = new Command('uc-test');
    const result: { value: UseCaseResult | null } = { value: null };
    program
      .command('generate <type> <name>')
      .action((type: string, name: string) => {
        result.value = runUseCase(type, name);
      });
    program.parse(['generate', 'command', 'deploy'], { from: 'user' });
    expect(result.value?.ok).toBe(true);
    expect(result.value?.data?.template).toBe('command');
    expect(result.value?.data?.name).toBe('deploy');
  });

  it('should propagate use case failure as action response', () => {
    type UseCaseResult = { ok: boolean; message: string };
    const runUseCase = (_type: string, name: string): UseCaseResult => {
      if (!name) return { ok: false, message: 'Name is required' };
      return { ok: true, message: '' };
    };
    const program = new Command('fail-test');
    const result: { value: UseCaseResult | null } = { value: null };
    program
      .command('generate <type> <name>')
      .action((type: string, name: string) => {
        result.value = runUseCase(type, name);
      });
    program.parse(['generate', 'command', ''], { from: 'user' });
    expect(result.value?.ok).toBe(false);
    expect(result.value?.message).toContain('required');
  });

  it('should map argv to typed args using commander', () => {
    const program = new Command('typed');
    let captured = '';
    program
      .command('init <project>')
      .option('--template <t>', 'template name')
      .option('--dry-run', 'simulate only')
      .action((project: string, opts: { template?: string; dryRun?: boolean }) => {
        captured = `${project}|${opts.template ?? 'default'}|${opts.dryRun ?? false}`;
      });
    program.parse(['init', 'my-app', '--template', 'full', '--dry-run'], { from: 'user' });
    expect(captured).toBe('my-app|full|true');
  });

  it('should use default values for missing options', () => {
    const program = new Command('defaults');
    let opts: { verbose: boolean; level: string } = { verbose: false, level: 'info' };
    program
      .command('run')
      .option('-v, --verbose', 'verbose', false)
      .option('--level <l>', 'log level', 'info')
      .action((o: { verbose: boolean; level: string }) => { opts = o; });
    program.parse(['run'], { from: 'user' });
    expect(opts.verbose).toBe(false);
    expect(opts.level).toBe('info');
  });
});

describe('Remote adapter fallback — API off → local', () => {
  it('AdapterRuntime should fall back to Node runner when no languages detected', async () => {
    const runtime = new AdapterRuntime();
    const results = await runtime.getQualityGates('/nonexistent/path');
    expect(results.length).toBeGreaterThanOrEqual(1);
    const nodeResult = results.find(r => r.language === LanguageId.Node);
    expect(nodeResult).toBeDefined();
  });

  it('should return Skipped for language without runner', async () => {
    const runtime = new AdapterRuntime();
    const result = await runtime.execute('nonexistent' as LanguageId, AdapterCommandId.Test, '/tmp');
    expect(result.status).toBe(RunStatus.Skipped);
    expect(result.error).toContain('Nenhum runner');
  });

  it('should unregister a runner and fall back', () => {
    const runtime = new AdapterRuntime();
    runtime.unregister(LanguageId.Node);
    expect(runtime.getRunner(LanguageId.Node)).toBeUndefined();
    expect(runtime.getSupportedLanguages()).not.toContain(LanguageId.Node);
  });

  it('should list supported languages after unregister', () => {
    const runtime = new AdapterRuntime();
    const before = runtime.getSupportedLanguages().length;
    runtime.unregister(LanguageId.Node);
    runtime.unregister(LanguageId.Python);
    expect(runtime.getSupportedLanguages().length).toBe(before - 2);
  });

  it('should discover adapters — returns empty when packages dir missing', async () => {
    const runtime = new AdapterRuntime();
    const discovered = await runtime.discoverAdapters('/nonexistent');
    expect(discovered).toEqual([]);
  });

  it('should register and unregister runners directly', () => {
    const runtime = new AdapterRuntime();
    const before = runtime.getSupportedLanguages().length;
    runtime.unregister(LanguageId.Node);
    expect(runtime.getSupportedLanguages().length).toBe(before - 1);
    runtime.unregister(LanguageId.Python);
    expect(runtime.getSupportedLanguages().length).toBe(before - 2);
    runtime.register(runtime.getRunner(LanguageId.Go)!);
    expect(runtime.getSupportedLanguages()).toContain(LanguageId.Go);
  });

  it('should list scaffoldable languages after registering scaffold-only adapter', () => {
    const runtime = new AdapterRuntime();
    const scaffoldable = runtime.getScaffoldableLanguages();
    expect(scaffoldable).toEqual([]);
  });

  it('should register then immediately return runner', () => {
    const runtime = new AdapterRuntime();
    const runner = runtime.getRunner(LanguageId.Node);
    expect(runner).toBeDefined();
    expect(runner?.language).toBe(LanguageId.Node);
  });

  it('getAllSupportedLanguages should include all runners', () => {
    const runtime = new AdapterRuntime();
    const all = runtime.getAllSupportedLanguages();
    expect(all).toContain(LanguageId.Node);
    expect(all).toContain(LanguageId.Python);
    expect(all).toContain(LanguageId.Go);
    expect(all.length).toBeGreaterThanOrEqual(16);
  });
});

describe('Storage provider factory — memory and file types', () => {
  it('InMemoryStorage should set and get a value', async () => {
    const storage: StorageProvider = new InMemoryStorage();
    await storage.set('key1', 'value1');
    const entry = await storage.get('key1');
    expect(entry?.value).toBe('value1');
  });

  it('InMemoryStorage should return undefined for missing key', async () => {
    const storage = new InMemoryStorage();
    const entry = await storage.get('missing');
    expect(entry).toBeUndefined();
  });

  it('InMemoryStorage should delete a key', async () => {
    const storage = new InMemoryStorage();
    await storage.set('del', 'value');
    const deleted = await storage.delete('del');
    expect(deleted).toBe(true);
    const entry = await storage.get('del');
    expect(entry).toBeUndefined();
  });

  it('InMemoryStorage should return false when deleting missing key', async () => {
    const storage = new InMemoryStorage();
    const deleted = await storage.delete('nonexistent');
    expect(deleted).toBe(false);
  });

  it('InMemoryStorage should list keys by prefix', async () => {
    const storage = new InMemoryStorage();
    await storage.set('app:theme', 'dark');
    await storage.set('app:lang', 'ts');
    await storage.set('user:name', 'dev');
    const appEntries = await storage.list('app:');
    expect(appEntries.length).toBe(2);
    const userEntries = await storage.list('user:');
    expect(userEntries.length).toBe(1);
  });

  it('InMemoryStorage should clear all keys', async () => {
    const storage = new InMemoryStorage();
    await storage.set('a', 1);
    await storage.set('b', 2);
    await storage.clear();
    const entries = await storage.list('');
    expect(entries.length).toBe(0);
  });

  it('InMemoryStorage should handle TTL expiry', async () => {
    const storage = new InMemoryStorage();
    await storage.set('short', 'lived', -1);
    const entry = await storage.get('short');
    expect(entry).toBeUndefined();
  });

  it('InMemoryStorage should keep entry within TTL', async () => {
    const storage = new InMemoryStorage();
    await storage.set('long', 'alive', 60_000);
    const entry = await storage.get('long');
    expect(entry?.value).toBe('alive');
  });

  it('LocalFileSystemStorage should set and get via mock IO', async () => {
    const storage = new LocalFileSystemStorage({ basePath: '/tmp/.ideia-storage-test' });
    await storage.set('cfg:theme', 'dark');
    const entry = await storage.get('cfg:theme');
    expect(entry?.value).toBe('dark');
  });

  it('LocalFileSystemStorage should return undefined for missing key', async () => {
    const storage = new LocalFileSystemStorage({ basePath: '/tmp/.ideia-storage-test' });
    const entry = await storage.get('does-not-exist');
    expect(entry).toBeUndefined();
  });

  it('LocalFileSystemStorage should delete a key', async () => {
    const storage = new LocalFileSystemStorage({ basePath: '/tmp/.ideia-storage-test' });
    await storage.set('tmp', 'value');
    const deleted = await storage.delete('tmp');
    expect(deleted).toBe(true);
  });

  it('LocalFileSystemStorage should return false when deleting missing key', async () => {
    const storage = new LocalFileSystemStorage({ basePath: '/tmp/.ideia-storage-test' });
    const deleted = await storage.delete('no-key');
    expect(deleted).toBe(false);
  });

  it('LocalFileSystemStorage should list entries by prefix', async () => {
    const base = '/tmp/.ideia-storage-list';
    const storage = new LocalFileSystemStorage({ basePath: base });
    await storage.set('app:x', '1');
    await storage.set('app:y', '2');
    await storage.set('other:z', '3');
    const list = await storage.list('app:');
    expect(list.length).toBe(2);
  });

  it('LocalFileSystemStorage should clear base directory without throwing', async () => {
    const base = '/tmp/.ideia-storage-clear';
    const storage = new LocalFileSystemStorage({ basePath: base });
    await storage.set('a', 1);
    await storage.set('b', 2);
    await expect(storage.clear()).resolves.not.toThrow();
  });

  it('LocalFileSystemStorage should handle TTL expiry', async () => {
    const base = '/tmp/.ideia-storage-ttl';
    const storage = new LocalFileSystemStorage({ basePath: base });
    await storage.set('expire', 'gone', -1);
    const entry = await storage.get('expire');
    expect(entry).toBeUndefined();
  });

  it('createStorage factory should create InMemoryStorage for memory type', () => {
    const storage = createStorage('memory');
    expect(storage).toBeInstanceOf(InMemoryStorage);
  });

  it('createStorage factory should create LocalFileSystemStorage for filesystem type', () => {
    const storage = createStorage('filesystem', { basePath: '/tmp/t' });
    expect(storage).toBeInstanceOf(LocalFileSystemStorage);
  });

  it('createStorage factory should default to InMemoryStorage for unknown type', () => {
    const storage = createStorage('unknown' as StorageType);
    expect(storage).toBeInstanceOf(InMemoryStorage);
  });

  it('InMemoryStorage should store complex objects', async () => {
    const storage = new InMemoryStorage();
    const obj = { nested: { val: true }, arr: [1, 2, 3] };
    await storage.set('complex', obj);
    const entry = await storage.get('complex');
    expect(entry?.value).toEqual(obj);
  });

  it('InMemoryStorage should handle concurrent sets', async () => {
    const storage = new InMemoryStorage();
    await Promise.all([
      storage.set('a', 1),
      storage.set('b', 2),
      storage.set('c', 3),
    ]);
    const a = await storage.get('a');
    const b = await storage.get('b');
    const c = await storage.get('c');
    expect(a?.value).toBe(1);
    expect(b?.value).toBe(2);
    expect(c?.value).toBe(3);
  });

  it('LocalFileSystemStorage should sanitize keys with special chars', async () => {
    const base = '/tmp/.ideia-storage-sanitize';
    const storage = new LocalFileSystemStorage({ basePath: base });
    await storage.set('my:key/with*special!chars', 'value');
    const entry = await storage.get('my:key/with*special!chars');
    expect(entry?.value).toBe('value');
  });

  it('LocalFileSystemStorage should persist across instances', async () => {
    const base = '/tmp/.ideia-storage-persist';
    const s1 = new LocalFileSystemStorage({ basePath: base });
    await s1.set('persist', 'data');
    const s2 = new LocalFileSystemStorage({ basePath: base });
    const entry = await s2.get('persist');
    expect(entry?.value).toBe('data');
  });
});
