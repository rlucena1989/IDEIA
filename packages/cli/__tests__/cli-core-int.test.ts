process.env.GTI_TEST_MODE = '1';

import { resetIO, getIO } from '../src/io';
import { MockIOContainer } from '../src/io/mock';
import { SettingsStore } from '../src/io/settings-store';
import { StateStore } from '../src/io/state-store';
import { adapterCommand } from '../src/commands/adapter';
import { Command } from 'commander';
import path from 'node:path';

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

describe('IO abstraction — MockIOContainer isolation', () => {
  it('should read written content back', () => {
    const fs = mockIO.fs;
    const filePath = path.resolve('/test/hello.txt');
    fs.write(filePath, 'world');
    expect(fs.read(filePath)).toBe('world');
  });

  it('should throw ENOENT for missing file', () => {
    expect(() => mockIO.fs.read(path.resolve('/nonexistent.txt'))).toThrow(/ENOENT/);
  });

  it('should detect file existence', () => {
    const fp = path.resolve('/tmp/exists.txt');
    mockIO.fs.write(fp, 'yes');
    expect(mockIO.fs.exists(fp)).toBe(true);
    expect(mockIO.fs.exists(path.resolve('/no.txt'))).toBe(false);
  });

  it('should append to existing content', () => {
    const fp = path.resolve('/tmp/log.txt');
    mockIO.fs.write(fp, 'line1\n');
    mockIO.fs.append(fp, 'line2\n');
    expect(mockIO.fs.read(fp)).toBe('line1\nline2\n');
  });

  it('should remove a file', () => {
    const fp = path.resolve('/tmp/temp.txt');
    mockIO.fs.write(fp, 'data');
    mockIO.fs.remove(fp);
    expect(mockIO.fs.exists(fp)).toBe(false);
  });

  it('should copy file content', () => {
    const src = path.resolve('/tmp/src.txt');
    const dst = path.resolve('/tmp/dst.txt');
    mockIO.fs.write(src, 'copied');
    mockIO.fs.copy(src, dst);
    expect(mockIO.fs.read(dst)).toBe('copied');
  });

  it('should ensure directory exists', () => {
    const dir = path.resolve('/tmp/some/deep/dir');
    mockIO.fs.ensureDir(dir);
    expect(mockIO.fs.exists(dir)).toBe(true);
  });

  it('should read directory entries', () => {
    const dir = path.resolve('/mydir');
    mockIO.fs.write(dir + '/a.json', '1');
    mockIO.fs.write(dir + '/b.json', '2');
    const entries = mockIO.fs.readDir(dir);
    expect(entries).toContain('a.json');
    expect(entries).toContain('b.json');
  });

  it('should read directory entries with type', () => {
    const dir = path.resolve('/mydir');
    mockIO.fs.write(dir + '/f.txt', 'content');
    mockIO.fs._addDir(dir + '/sub');
    const entries = mockIO.fs.readDirEntries(dir);
    const fileEntry = entries.find(e => e.name === 'f.txt');
    const dirEntry = entries.find(e => e.name === 'sub');
    expect(fileEntry?.isFile()).toBe(true);
    expect(dirEntry?.isDirectory()).toBe(true);
  });

  it('should stat a file', () => {
    const fp = path.resolve('/tmp/statted.txt');
    mockIO.fs.write(fp, '12345');
    const s = mockIO.fs.stat(fp);
    expect(s.size).toBe(5);
    expect(s.isDirectory()).toBe(false);
  });

  it('should reset IO and create fresh mock', () => {
    mockIO.fs.write(path.resolve('/tmp/persist.txt'), 'val');
    resetIO();
    const io2 = getIO() as unknown as MockIOContainer;
    expect(io2.fs.exists(path.resolve('/tmp/persist.txt'))).toBe(false);
  });

  it('should setupProject with standard files', () => {
    mockIO.setupProject('my-proj');
    const cwd = process.cwd();
    expect(mockIO.fs.exists(path.join(cwd, 'package.json'))).toBe(true);
    expect(mockIO.fs.exists(path.join(cwd, '.ai', 'laws.yaml'))).toBe(true);
    expect(mockIO.fs.exists(path.join(cwd, '.ai', 'project-manifest.yaml'))).toBe(true);
    expect(mockIO.fs.exists(path.join(cwd, 'README.md'))).toBe(true);
  });

  it('should mock shell exec with registered result', () => {
    mockIO.shell._addResult('node', ['--version'], { status: 0, stdout: 'v20', stderr: '' });
    const r = mockIO.shell.exec('node', ['--version']);
    expect(r.stdout).toBe('v20');
  });

  it('should mock shell exec with default result', () => {
    mockIO.shell._setDefault({ status: 0, stdout: 'default-out', stderr: '' });
    const r = mockIO.shell.exec('unknown', ['cmd']);
    expect(r.stdout).toBe('default-out');
  });

  it('should mock http client', async () => {
    mockIO.http._addResult('http://api.test/data', { status: 200, data: '{"ok":true}' });
    const r = await mockIO.http.get('http://api.test/data');
    expect(r.data).toBe('{"ok":true}');
  });

  it('should return default http response for unknown url', async () => {
    const r = await mockIO.http.post('http://unknown', {});
    expect(r.status).toBe(200);
    expect(r.data).toBe('{}');
  });
});

describe('SettingsStore via mock IO', () => {
  let store: SettingsStore;

  beforeEach(() => {
    store = new SettingsStore('/tmp/.ideia-test');
  });

  it('should default to empty settings', () => {
    const all = store.getAll();
    expect(all).toEqual({});
  });

  it('should set and get a string value', () => {
    store.set('theme', 'dark');
    expect(store.get('theme')).toBe('dark');
  });

  it('should set and get a number value', () => {
    store.set('autonomyLevel', 3);
    expect(store.get('autonomyLevel')).toBe(3);
  });

  it('should set and get a boolean value', () => {
    store.set('autoAudit', true);
    expect(store.get('autoAudit')).toBe(true);
  });

  it('should return default for missing key', () => {
    expect(store.get('missing', 42)).toBe(42);
  });

  it('should return undefined for missing key without default', () => {
    expect(store.get('doesNotExist')).toBeUndefined();
  });

  it('should delete a key', () => {
    store.set('tempKey', 'temp');
    store.delete('tempKey');
    expect(store.get('tempKey')).toBeUndefined();
  });

  it('should delete a non-existent key without error', () => {
    expect(() => store.delete('noKey')).not.toThrow();
  });

  it('should clear all settings', () => {
    store.set('a', 1);
    store.set('b', 2);
    store.clear();
    expect(store.get('a')).toBeUndefined();
    expect(store.get('b')).toBeUndefined();
  });

  it('should getAll return a copy', () => {
    store.set('theme', 'dark');
    const all = store.getAll();
    all.theme = 'light';
    expect(store.get('theme')).toBe('dark');
  });

  it('should persist settings to mock filesystem', () => {
    store.set('editor', 'vscode');
    const fs = mockIO.fs;
    const settingsFile = path.resolve('/tmp/.ideia-test/settings.json');
    expect(fs.exists(settingsFile)).toBe(true);
    const raw = fs.read(settingsFile);
    const parsed = JSON.parse(raw);
    expect(parsed.editor).toBe('vscode');
  });

  it('should load existing settings from filesystem on second instance', () => {
    store.set('language', 'pt-BR');
    const store2 = new SettingsStore('/tmp/.ideia-test');
    expect(store2.get('language')).toBe('pt-BR');
  });

  it('should handle complex objects as values', () => {
    const obj = { nested: { key: 'val' }, arr: [1, 2, 3] };
    store.set('complex', obj);
    const retrieved = store.get<typeof obj>('complex');
    expect(retrieved).toEqual(obj);
  });

  it('should handle many keys without collision', () => {
    for (let i = 0; i < 20; i++) {
      store.set(`key${i}`, i);
    }
    for (let i = 0; i < 20; i++) {
      expect(store.get(`key${i}`)).toBe(i);
    }
  });
});

describe('StateStore via mock IO', () => {
  let store: StateStore;

  beforeEach(() => {
    store = new StateStore('/tmp/.ideia-test-state');
  });

  it('should default to empty state', () => {
    expect(store.getAll()).toEqual({});
  });

  it('should set and get state', () => {
    store.setState('phase', 'implementation');
    expect(store.getState('phase')).toBe('implementation');
  });

  it('should get default value for missing key', () => {
    expect(store.getState('missing', 'fallback')).toBe('fallback');
  });

  it('should get undefined for missing key without default', () => {
    expect(store.getState('noKey')).toBeUndefined();
  });

  it('should delete a state key', () => {
    store.setState('temp', 'val');
    store.delete('temp');
    expect(store.getState('temp')).toBeUndefined();
  });

  it('should clear all state', () => {
    store.setState('a', 1);
    store.setState('b', 2);
    store.clear();
    expect(store.getState('a')).toBeUndefined();
    expect(store.getState('b')).toBeUndefined();
  });

  it('should get all state as a copy', () => {
    store.setState('coverageScore', 85);
    store.setState('gapsResolved', 70);
    const all = store.getAll();
    expect(all.coverageScore).toBe(85);
    expect(all.gapsResolved).toBe(70);
  });

  it('should persist state to mock filesystem', () => {
    store.setState('currentProject', 'test-proj');
    const stateFile = path.resolve('/tmp/.ideia-test-state/state.json');
    expect(mockIO.fs.exists(stateFile)).toBe(true);
    const parsed = JSON.parse(mockIO.fs.read(stateFile));
    expect(parsed.currentProject).toBe('test-proj');
  });

  it('should load state from filesystem on new instance', () => {
    store.setState('lastCommand', 'deploy');
    const store2 = new StateStore('/tmp/.ideia-test-state');
    expect(store2.getState('lastCommand')).toBe('deploy');
  });

  it('should handle various value types', () => {
    store.setState('string', 'hello');
    store.setState('number', 42);
    store.setState('boolean', true);
    store.setState('array', [1, 2, 3]);
    store.setState('object', { a: 1 });
    expect(store.getState('string')).toBe('hello');
    expect(store.getState('number')).toBe(42);
    expect(store.getState('boolean')).toBe(true);
    expect(store.getState('array')).toEqual([1, 2, 3]);
    expect(store.getState('object')).toEqual({ a: 1 });
  });

  it('should NOT leak state between different instances', () => {
    store.setState('shared', 'original');
    const store2 = new StateStore('/tmp/.ideia-test-state-2');
    expect(store2.getState('shared')).toBeUndefined();
  });
});

describe('Command adapter pattern — base CLI adapter', () => {
  it('adapterCommand should create a Commander command named adapter', () => {
    const cmd = adapterCommand();
    expect(cmd.name()).toBe('adapter');
  });

  it('adapterCommand should have list subcommand', () => {
    const cmd = adapterCommand();
    const list = cmd.commands.find(c => c.name() === 'list');
    expect(list).toBeDefined();
    expect(list?.description()).toBeTruthy();
  });

  it('adapterCommand should have detect subcommand', () => {
    const cmd = adapterCommand();
    const detect = cmd.commands.find(c => c.name() === 'detect');
    expect(detect).toBeDefined();
    expect(detect?.description()).toBeTruthy();
  });

  it('adapterCommand should have validate subcommand', () => {
    const cmd = adapterCommand();
    const validate = cmd.commands.find(c => c.name() === 'validate');
    expect(validate).toBeDefined();
    expect(validate?.description()).toBeTruthy();
  });

  it('should create a custom command with subcommands programmatically', () => {
    const program = new Command('test-cli');
    const sub = new Command('greet')
      .description('Say hello')
      .argument('<name>', 'person to greet')
      .action((_name: string) => { /* noop */ });
    program.addCommand(sub);
    expect(program.commands.length).toBe(1);
    expect(program.commands[0].name()).toBe('greet');
  });

  it('should parse command arguments', () => {
    const program = new Command('test');
    let captured = '';
    program
      .command('echo <msg>')
      .action((msg: string) => { captured = msg; });
    program.parse(['echo', 'hello-world'], { from: 'user' });
    expect(captured).toBe('hello-world');
  });

  it('should handle --dry-run flag', () => {
    const program = new Command('test');
    let dryRun = false;
    program
      .command('deploy')
      .option('--dry-run', 'simulate')
      .action((opts: { dryRun: boolean }) => { dryRun = opts.dryRun; });
    program.parse(['deploy', '--dry-run'], { from: 'user' });
    expect(dryRun).toBe(true);
  });

  it('should handle --json flag', () => {
    const program = new Command('test');
    let jsonFlag = false;
    program
      .command('status')
      .option('--json', 'json output')
      .action((opts: { json: boolean }) => { jsonFlag = opts.json; });
    program.parse(['status', '--json'], { from: 'user' });
    expect(jsonFlag).toBe(true);
  });
});
